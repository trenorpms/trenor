// ─── Agent Response Block Types ───
// The AI agent returns an array of these blocks.
// The frontend renders each block as the appropriate UI element.

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface FormField {
  key: string;
  label: string;
  fieldType: 'text' | 'email' | 'tel' | 'number' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: string[]; // for select
  value?: string;
}

export interface FormBlock {
  type: 'form';
  fields: FormField[];
  submitLabel: string;
  onSubmitAction: string;
}

export interface FileUploadBlock {
  type: 'file_upload';
  accept: string;
  label: string;
  description?: string;
  onUploadAction: string;
}

export interface ImageUploadBlock {
  type: 'image_upload';
  label: string;
  description?: string;
  onUploadAction: string;
}

export interface DataTableBlock {
  type: 'data_table';
  title?: string;
  columns: { key: string; label: string }[];
  rows: Record<string, any>[];
  editable: boolean;
}

export interface ConfirmationBlock {
  type: 'confirmation';
  title: string;
  summary: Record<string, any>;
  confirmAction: string;
  cancelAction?: string;
}

export interface StepGuideBlock {
  type: 'step_guide';
  steps: { title: string; description?: string; status: 'pending' | 'running' | 'done' | 'error' }[];
}

export interface ErrorBlock {
  type: 'error';
  message: string;
  suggestion?: string;
}

export type AgentResponseBlock =
  | TextBlock
  | FormBlock
  | FileUploadBlock
  | ImageUploadBlock
  | DataTableBlock
  | ConfirmationBlock
  | StepGuideBlock
  | ErrorBlock;

// ─── Conversation State ───
// Passed back and forth between frontend and backend to maintain multi-turn context.

export interface ConversationState {
  intent?: string;
  step?: string; // 'idle' | 'awaiting_file' | 'file_parsed' | 'gaps_filled' | 'awaiting_photo' | 'awaiting_confirmation' | 'deploying' | 'complete'
  parsedData?: ParsedPropertyData;
  validationErrors?: ValidationError[];
  gapFields?: FormField[];
  filledGaps?: Record<string, string>;
  fileUrl?: string;
  photoUrl?: string;
  history?: string[]; // stack of previous steps for "go back"
}

export interface ParsedPropertyData {
  property: {
    name: string;
    address: string;
    type?: string;
    unitsCount: number;
  };
  tenants: ParsedTenant[];
}

export interface ParsedTenant {
  name: string;
  email: string;
  phone: string;
  unit: string;
  rent: string;
  arrears: number;
  status?: string;
}

export interface ValidationError {
  row?: number;
  field: string;
  message: string;
  tenantName?: string;
}

// ─── Agent Context ───
// Injected into every tool call for permission checks.

export interface AgentContext {
  landlordId: string;
  landlordName: string;
  landlordEmail: string;
  tier: 'free' | 'pro' | 'partner';
  propertiesCount: number;
  tenantsCount: number;
}

// ─── Tool Result ───
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  log: string; // Human-readable log line
}

// ─── Agent Run Request / Response ───
export interface AgentRunRequest {
  action: 'chat' | 'upload_file' | 'upload_photo' | 'submit_form' | 'confirm_deploy' | 'go_back' | 'edit_data';
  message?: string;
  formData?: Record<string, string>;
  conversationState?: ConversationState;
  // file is handled via multipart
}

export interface AgentRunResponse {
  blocks: AgentResponseBlock[];
  conversationState: ConversationState;
}

// ─── Activity Log Entry ───
export interface ActivityLogEntry {
  id: number;
  landlordId: string;
  action: string;
  description: string;
  toolName?: string;
  status: string;
  createdAt: string;
}
