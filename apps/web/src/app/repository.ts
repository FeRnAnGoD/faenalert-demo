export interface RecordItem {
  id: number;
  title: string;
  subtitle: string;
  status: string;
  date: string;
  owner: string;
  type: string;
  priority?: string;
  notes?: string;
  apiId?: string;
  version?: number;
  sourceCode?: string;
  relatedApiId?: string;
  apiStatus?: string;
  scheduledAt?: string;
  location?: string;
  agenda?: string;
  ownerId?: string;
}

export interface Member {
  id: number;
  name: string;
  job: string;
  representation: string;
  role: string;
  type: string;
  memberKind?: "REPRESENTATIVE" | "PREVENTION_EXPERT";
  office?: "PRESIDENT" | "SECRETARY" | null;
  email: string;
  status: string;
  apiId?: string;
  version?: number;
}

export interface Site {
  id: number;
  name: string;
  company: string;
  sector: string;
  region?: string;
  workers?: number;
  image?: string;
  imageAlt?: string;
  photoCredit?: string;
  apiId?: string;
}

export interface FaenaReference {
  id: string;
  slug: string;
  name: string;
  operatorName: string;
  operatorSourceUrl: string;
  region: string;
  commune?: string | null;
  operationType: string;
  description: string;
  officialSourceUrl: string;
  commodities: string[];
  image: string;
  imageAlt: string;
  imageCaption: string;
  photoCredit: string;
  photoLicense: string;
  photoLicenseUrl?: string | null;
  photoSourceUrl: string;
}

export interface DemoState {
  sites: Site[];
  faenaReferences: FaenaReference[];
  members: Member[];
  meetings: RecordItem[];
  actions: RecordItem[];
  incidents: RecordItem[];
  minutes: RecordItem[];
  documents: RecordItem[];
  trainings: RecordItem[];
  commissions: RecordItem[];
}
