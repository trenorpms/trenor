import { Controller, Post, Body, UploadedFile, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('billing-session')
  @HttpCode(HttpStatus.OK)
  async getBillingSession(
    @Body() body: { email: string; tier: 'pro' | 'partner'; successUrl: string; cancelUrl: string }
  ) {
    return this.onboardingService.createStripeSession(
      body.email,
      body.tier,
      body.successUrl,
      body.cancelUrl
    );
  }

  @Post('parse-lease')
  @UseInterceptors(FileInterceptor('file'))
  async parseLease(
    @UploadedFile() file: any
  ) {
    if (!file) {
      return {
        address: '456 Oak Ave, Unit 1A',
        tenantName: 'Bob Smith',
        rentAmount: 1800,
        unitsCount: 1,
        fileUrl: '',
      };
    }

    // 1. Upload to Cloudflare R2
    const uploadResult = await this.onboardingService.uploadToR2(
      file.originalname,
      file.buffer,
      file.mimetype
    );

    // 2. Parse using Gemini
    const parsedData = await this.onboardingService.parseDocumentWithGemini(
      file.buffer,
      file.mimetype
    );

    return {
      ...parsedData,
      fileUrl: uploadResult.publicUrl,
    };
  }
}
