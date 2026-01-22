// client/src/types/index.ts
export interface Salon {
    _id: string;
    name: string;
    address: string;
    rating: number;
    images: string[];
    isApproved: boolean;
}