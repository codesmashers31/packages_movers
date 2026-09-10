export type RootStackParamList = {
  Home: undefined;
  Customer: undefined;
  Worker: undefined;
};

export interface MoveRequestDraft {
  pickupAddress: string;
  destinationAddress: string;
  preferredDate: string;
  services: string[];
}
