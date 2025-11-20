export interface OnlinePBXWebhookDto {
  event?: string;
  type?: string;
  action?: string;
  hook?: string;
  callId?: string;
  call_id?: string;
  uuid?: string;
  direction?: 'inbound' | 'outbound' | 'in' | 'out';
  srcNumber?: string;
  dstNumber?: string;
  from?: string;
  to?: string;
  clientNumber?: string;
  client_number?: string;
  clientPhone?: string;
  operatorNumber?: string;
  operator_number?: string;
  operatorPhone?: string;
  operatorName?: string;
  operator_name?: string;
  startedAt?: string;
  endedAt?: string;
  timestamp?: number | string;
  startTime?: number | string;
  endTime?: number | string;
  duration?: number;
  answered?: boolean;
  status?: string;
  recordUrl?: string;
  record_url?: string;
  recordLink?: string;
  recordId?: string;
  payload?: Record<string, any>;
  [key: string]: any;
}


