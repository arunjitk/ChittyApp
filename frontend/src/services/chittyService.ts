import api from './authService';

export interface ChittyPayment {
  id: number;
  member_id: number;
  month: number;
  phone: string | null;
  upi_id: string | null;
  screenshot_path: string | null;
  notes: string | null;
  paid_at: string | null;
  member_name?: string;
  member_index?: number;
  payout_month?: number;
  created_at: string;
  updated_at: string;
}

export interface ChittyGroup {
  id: number;
  name: string;
  total_members: number;
  chitty_amount: number;
  payout_day: number;
  subscription_deadline_day: number;
  current_month: number;
  start_year: number;
  start_month: number;
  upi_id: string;
  account_number: string;
  ifsc_code: string;
  penalty_amount: number;
}

export interface LinkedUser {
  id: number;
  name: string;
  email: string;
}

export interface UserChitty {
  id: number;
  user_id: number | null;
  member_name: string;
  member_index: number;
  payout_month: number;
  penalties_due: number;
  status: 'active' | 'paid' | 'transferred';
  transfer_requested: number;
  transfer_approved: number;
  paid_month: number | null;
  linked_user?: LinkedUser | null;
}

export interface ChittyScheduleMonth {
  month: number;
  calendar_label: string;
  month_name: string;
  year: number;
  is_recipient: boolean;
  is_past: boolean;
  is_current: boolean;
  // Contribution fields (is_recipient === false)
  contribution_amount?: number;
  contribution_status?: 'paid' | 'unpaid' | 'due' | 'upcoming';
  // Payout fields (is_recipient === true)
  payout_amount?: number;
  payout_status?: 'received' | 'missed' | 'pending' | 'upcoming';
  // Shared
  paid_at: string | null;
  upi_id?: string | null;
  phone?: string | null;
  notes: string | null;
}

export interface MyChittyData {
  group: ChittyGroup;
  member: UserChitty | null;
  payoutInfo: any;
  currentPayout: PayoutInfo | null;
  nextPayout: PayoutInfo | null;
  schedule: ScheduleEntry[];
  linked: boolean;
  payout_schedule: ChittyScheduleMonth[];
}

export interface LinkableUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

export interface PayoutInfo {
  member_name: string;
  month: number;
  month_name: string;
  year: number;
  payout_day: number;
  amount: number;
  status?: string;
  is_me: boolean;
}

export interface ScheduleEntry {
  member_name: string;
  payout_month: number;
  month_name: string;
  year: number;
  status: 'active' | 'paid' | 'transferred';
  is_me: boolean;
}

export const chittyService = {
  async getGroup(): Promise<ChittyGroup> {
    const response = await api.get('/chitty/group');
    return response.data.group;
  },

  async updateGroup(fields: Partial<ChittyGroup>): Promise<ChittyGroup> {
    const response = await api.patch('/chitty/group', fields);
    return response.data.group;
  },

  async getMyChitty(): Promise<MyChittyData> {
    const response = await api.get('/chitty/my-chitty');
    return response.data;
  },

  async getAllMembers(): Promise<UserChitty[]> {
    const response = await api.get('/chitty/all-members');
    return response.data.members;
  },

  async getLinkableUsers(): Promise<LinkableUser[]> {
    const response = await api.get('/chitty/linkable-users');
    return response.data.users;
  },

  async linkMemberToUser(memberId: number, userId: number | null): Promise<UserChitty> {
    const response = await api.put(`/chitty/${memberId}/link-user`, { user_id: userId });
    return response.data.member;
  },

  async updateMember(id: number, fields: Partial<UserChitty>): Promise<UserChitty> {
    const response = await api.patch(`/chitty/${id}`, fields);
    return response.data.member;
  },

  async requestTransfer(id: number): Promise<void> {
    await api.post(`/chitty/${id}/request-transfer`);
  },

  async swapMonths(id1: number, id2: number): Promise<UserChitty[]> {
    const response = await api.post('/chitty/swap-months', { id1, id2 });
    return response.data.members;
  },

  async advanceMonth(): Promise<{ group: ChittyGroup; members: UserChitty[] }> {
    const response = await api.post('/chitty/advance-month');
    return response.data;
  },

  async getAllPayments(): Promise<ChittyPayment[]> {
    const response = await api.get('/chitty/payments');
    return response.data.payments;
  },

  async getMyPayments(): Promise<ChittyPayment[]> {
    const response = await api.get('/chitty/my-payments');
    return response.data.payments;
  },

  async savePayment(data: { member_id: number; month: number; phone?: string; upi_id?: string; notes?: string; paid_at?: string }): Promise<ChittyPayment> {
    const response = await api.post('/chitty/payments', data);
    return response.data.payment;
  },

  async uploadScreenshot(member_id: number, month: number, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('screenshot', file);
    const response = await api.post(`/chitty/payments/${member_id}/${month}/screenshot`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.screenshot_path;
  },

  async removeScreenshot(member_id: number, month: number): Promise<void> {
    await api.delete(`/chitty/payments/${member_id}/${month}/screenshot`);
  },

  async deletePayment(member_id: number, month: number): Promise<void> {
    await api.delete(`/chitty/payments/${member_id}/${month}`);
  },
};
