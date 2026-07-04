/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Competitor {
  name: string;
  website: string;
}

export interface CompanyResearchResult {
  companyName: string;
  website: string;
  phone: string;
  address: string;
  summary: string;
  products: string[];
  painPoints: string[];
  competitors: Competitor[];
  crawledPages: { url: string; title: string }[];
}

export interface ApiConfig {
  openrouterKey: string;
  serperKey: string;
  aiModel: string;
}

export interface DiscordConfig {
  botToken: string;
  channelId: string;
  applicantName: string;
  applicantEmail: string;
}

export interface ResearchRequest {
  input: string; // Company Name or Website URL
  apiConfig: ApiConfig;
  discordConfig?: DiscordConfig;
}

export interface ResearchResponse {
  success: boolean;
  result: CompanyResearchResult;
  discordSuccess?: boolean;
  error?: string;
}

export interface PdfDownloadRequest {
  result: CompanyResearchResult;
}

export interface DiscordTestRequest {
  discordConfig: DiscordConfig;
  result?: CompanyResearchResult;
}

export interface ProgressStep {
  id: string;
  label: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}
