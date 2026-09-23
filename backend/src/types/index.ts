export type UserRole = 'customer' | 'vendor' | 'worker' | 'admin';

export type RequestStatus = 'DRAFT' | 'OPEN' | 'RESERVED' | 'BOOKED' | 'CLOSED' | 'EXPIRED';

export type QuoteStatus = 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'WITHDRAWN' | 'EXPIRED' | 'SUPERSEDED' | 'NOT_SELECTED' | 'REJECTED';

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'ASSIGNED'
  | 'EN_ROUTE_PICKUP'
  | 'ARRIVED_PICKUP'
  | 'PACKING'
  | 'LOADING'
  | 'IN_TRANSIT'
  | 'ARRIVED_DROPOFF'
  | 'UNLOADING'
  | 'AWAITING_CONFIRMATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'TERMINATED';

export type VendorStatus = 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface AuthUser {
  id: string;
  phone: string;
  displayName?: string;
  username?: string;
  role: UserRole;
  adminRole?: string;
  adminDepartment?: string;
  employeeRole?: string;
  vendorId?: string;
}

