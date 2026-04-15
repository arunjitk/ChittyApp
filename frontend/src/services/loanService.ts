import api from './authService';

export interface LoanApplication {
  id: number;
  user_id: number;
  amount: number;
  purpose: string;
  applied_on: string;
  repayment_date: string;
  interest_amount: number;
  total_due: number;
  status: 'pending' | 'approved' | 'closed' | 'foreclosed' | 'rejected';
  admin_notes?: string;
  approved_on?: string;
  closed_on?: string;
  foreclosed_on?: string;
  screenshot_path?: string;
  payment_received_date?: string;
  approval_screenshot_path?: string;
  rejected_on?: string;
  user_name?: string;
  user_email?: string;
}

export interface PoolSummary {
  total_pool: number;
  amount_disbursed: number;
  available_balance: number;
  total_interest_collected: number;
  active_loans_total: number;
  expected_interest: number;
}

export const loanService = {
  async applyForLoan(loanData: {
    amount: number;
    purpose: string;
    repayment_date: string;
  }) {
    const response = await api.post('/loans/apply', loanData);
    return response.data;
  },

  async getMyLoans() {
    const response = await api.get('/loans/my-loans');
    return response.data.loans as LoanApplication[];
  },

  async calculateInterest(amount: number, repaymentDate: string) {
    const response = await api.post('/loans/calculate-interest', {
      amount,
      repayment_date: repaymentDate
    });
    return response.data;
  },

  async getAllLoans() {
    const response = await api.get('/loans/all');
    return response.data.loans as LoanApplication[];
  },

  async getPendingLoans() {
    const response = await api.get('/loans/pending');
    return response.data.loans as LoanApplication[];
  },

  async getActiveLoans() {
    const response = await api.get('/loans/active');
    return response.data.loans as LoanApplication[];
  },

  async approveLoan(loanId: number, opts?: { adminNotes?: string; approvedDate?: string; screenshot?: File }) {
    const form = new FormData();
    if (opts?.adminNotes) form.append('admin_notes', opts.adminNotes);
    if (opts?.approvedDate) form.append('approved_date', opts.approvedDate);
    if (opts?.screenshot) form.append('screenshot', opts.screenshot);
    const response = await api.post(`/loans/${loanId}/approve`, form);
    return response.data;
  },

  async rejectLoan(loanId: number, adminNotes: string, rejectedOn?: string) {
    const response = await api.post(`/loans/${loanId}/reject`, {
      admin_notes: adminNotes,
      rejected_on: rejectedOn,
    });
    return response.data;
  },

  async closeLoan(loanId: number, opts?: { screenshot?: File; paymentDate?: string }) {
    const form = new FormData();
    if (opts?.screenshot) form.append('screenshot', opts.screenshot);
    if (opts?.paymentDate) form.append('payment_received_date', opts.paymentDate);
    const response = await api.post(`/loans/${loanId}/close`, form);
    return response.data;
  },

  async forecloseLoan(loanId: number, opts?: { screenshot?: File; paymentDate?: string; adminNotes?: string }) {
    const form = new FormData();
    if (opts?.screenshot) form.append('screenshot', opts.screenshot);
    if (opts?.paymentDate) form.append('payment_received_date', opts.paymentDate);
    if (opts?.adminNotes) form.append('admin_notes', opts.adminNotes);
    const response = await api.post(`/loans/${loanId}/foreclose`, form);
    return response.data;
  },

  async deleteLoan(loanId: number) {
    const response = await api.delete(`/loans/${loanId}`);
    return response.data;
  },

  async updateLoan(loanId: number, updateData: {
    amount?: number;
    purpose?: string;
    repayment_date?: string;
  }) {
    const response = await api.put(`/loans/${loanId}`, updateData);
    return response.data;
  },

  async getPendingPublic() {
    const response = await api.get('/loans/pending-public');
    return response.data.loans as (LoanApplication & { is_mine: boolean; my_swap_request: any })[];
  },

  async requestSwap(loanId: number) {
    const response = await api.post(`/loans/${loanId}/request-swap`);
    return response.data;
  },

  async getMySwapRequests() {
    const response = await api.get('/loans/my-swap-requests');
    return response.data.requests as any[];
  },

  async approveSwapOwner(requestId: number) {
    const response = await api.post(`/loans/swap-requests/${requestId}/approve-owner`);
    return response.data;
  },

  async rejectSwapOwner(requestId: number) {
    const response = await api.post(`/loans/swap-requests/${requestId}/reject-owner`);
    return response.data;
  },

  async getAdminSwapRequests() {
    const response = await api.get('/loans/admin-swap-requests');
    return response.data.requests as any[];
  },

  async approveSwapAdmin(requestId: number) {
    const response = await api.post(`/loans/swap-requests/${requestId}/approve-admin`);
    return response.data;
  },

  async rejectSwapAdmin(requestId: number) {
    const response = await api.post(`/loans/swap-requests/${requestId}/reject-admin`);
    return response.data;
  },

  async getSwappedLoans() {
    const response = await api.get('/loans/swapped-loans');
    return response.data.requests as any[];
  },

  async deleteSwapRequest(requestId: number) {
    const response = await api.delete(`/loans/swap-requests/${requestId}`);
    return response.data;
  }
};

export const poolService = {
  async getSummary() {
    const response = await api.get('/pool/summary');
    return response.data.summary as PoolSummary;
  },

  async getDashboard() {
    const response = await api.get('/pool/dashboard');
    return response.data.dashboard;
  },

  async addToPool(amount: number) {
    const response = await api.post('/pool/add', { amount });
    return response.data;
  },

  async setAvailableBalance(amount: number) {
    const response = await api.put('/pool/available', { amount });
    return response.data;
  },

  async setInterestCollected(amount: number) {
    const response = await api.put('/pool/interest', { amount });
    return response.data;
  },

  async resetInterest() {
    const response = await api.delete('/pool/interest');
    return response.data;
  },

  async transferInterest() {
    const response = await api.post('/pool/transfer-interest');
    return response.data;
  }
};