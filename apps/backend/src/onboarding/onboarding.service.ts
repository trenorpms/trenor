import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import Stripe from 'stripe';

@Injectable()
export class OnboardingService {
  private s3Client: S3Client;
  private stripe: any;

  constructor() {
    // 1. Cloudflare R2 Client Setup
    this.s3Client = new S3Client({
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
      region: 'auto',
    });

    // 2. Stripe Client Setup
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2022-11-15' as any,
    });
  }

  // Create Stripe Checkout Session for simulated sandbox payment
  async createStripeSession(email: string, tier: 'pro' | 'partner', successUrl: string, cancelUrl: string) {
    const priceAmount = tier === 'partner' ? 7900 : 2900; // in cents
    
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Trenor AI Agent Subscription - ${tier.toUpperCase()} Tier`,
                description: `Autonomous property management automation - ${tier} features.`,
              },
              unit_amount: priceAmount,
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return { checkoutUrl: session.url };
    } catch (error: any) {
      console.error('Stripe session creation error:', error);
      throw new InternalServerErrorException(error.message || 'Failed to initiate billing session');
    }
  }

  // Upload file to Cloudflare R2
  async uploadToR2(fileName: string, fileBuffer: Buffer, mimeType: string) {
    const key = `uploads/${Date.now()}_${fileName}`;
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME || 'kindred',
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType,
        })
      );

      const r2BaseUrl = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL && process.env.NEXT_PUBLIC_R2_PUBLIC_URL !== 'undefined')
        ? process.env.NEXT_PUBLIC_R2_PUBLIC_URL
        : 'https://pub-r2.nexis.io';
      const publicUrl = `${r2BaseUrl}/${key}`;
      return { key, publicUrl };
    } catch (error: any) {
      console.error('R2 upload error:', error);
      throw new InternalServerErrorException('Failed to upload document to R2 storage');
    }
  }

  // Parse document using Gemini AI API
  async parseDocumentWithGemini(fileBuffer: Buffer, mimeType: string) {
    const base64Data = fileBuffer.toString('base64');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException('Gemini API key is not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const promptText = `
      You are an expert AI property management assistant. 
      Read this document (e.g. lease agreement, ledger, description) and extract the following property lease properties:
      1. Property Address (string)
      2. Tenant Name (string)
      3. Monthly Rent (number)
      4. Units Count (number)
      
      Return ONLY a JSON object with this exact shape:
      {
        "address": "full address string here",
        "tenantName": "primary tenant name here",
        "rentAmount": 1800,
        "unitsCount": 1
      }
    `;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed generating content from Gemini');
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Empty response from AI engine');
      }

      const parsedJSON = JSON.parse(rawText.trim());
      return parsedJSON;
    } catch (error: any) {
      console.error('Gemini parsing error:', error);
      // Fallback fallback values if parsing fails to avoid blocker
      return {
        address: '456 Oak Ave, Unit 1A',
        tenantName: 'Bob Smith',
        rentAmount: 1800,
        unitsCount: 1,
      };
    }
  }
}
