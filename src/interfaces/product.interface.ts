export interface Product {
    id: number;
    url: string;
    name: string;
    current_price: number;
    user_uid: string;
    user_email: string;
    last_checked_at: Date;
    created_at: Date;
    updated_at: Date;
}
