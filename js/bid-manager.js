class BidManager {
    constructor() {
        this.bids = JSON.parse(localStorage.getItem('bids')) || [];
    }

    // Create a new bid
    async createBid(lotNumber, maxBidAmount) {
        try {
            const user = await authHandler.getCurrentUser();
            if (!user) throw new Error('User not authenticated');

            const depositAmount = maxBidAmount > 2500 ? maxBidAmount * 0.10 : 0;
            const status = 'pending';

            const newBid = {
                id: Date.now().toString(),
                user_id: user.id,
                lot_number: lotNumber,
                max_bid_amount: maxBidAmount,
                deposit_amount: depositAmount,
                status: status,
                created_at: new Date().toISOString()
            };

            this.bids.push(newBid);
            this.saveBids();

            return { success: true, data: newBid };
        } catch (error) {
            console.error('Create bid error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user's bids
    async getUserBids() {
        try {
            const user = await authHandler.getCurrentUser();
            if (!user) throw new Error('User not authenticated');

            const userBids = this.bids.filter(bid => bid.user_id === user.id);
            return { success: true, data: userBids };
        } catch (error) {
            console.error('Get bids error:', error);
            return { success: false, error: error.message };
        }
    }

    // Update bid status
    async updateBidStatus(bidId, status) {
        try {
            const bidIndex = this.bids.findIndex(bid => bid.id === bidId);
            if (bidIndex === -1) throw new Error('Bid not found');

            this.bids[bidIndex].status = status;
            this.saveBids();

            return { success: true };
        } catch (error) {
            console.error('Update bid error:', error);
            return { success: false, error: error.message };
        }
    }

    // Save bids to localStorage
    saveBids() {
        localStorage.setItem('bids', JSON.stringify(this.bids));
    }

    // Get bid by ID
    async getBidById(bidId) {
        try {
            const bid = this.bids.find(bid => bid.id === bidId);
            if (!bid) throw new Error('Bid not found');
            return { success: true, data: bid };
        } catch (error) {
            console.error('Get bid error:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete bid
    async deleteBid(bidId) {
        try {
            const bidIndex = this.bids.findIndex(bid => bid.id === bidId);
            if (bidIndex === -1) throw new Error('Bid not found');

            this.bids.splice(bidIndex, 1);
            this.saveBids();

            return { success: true };
        } catch (error) {
            console.error('Delete bid error:', error);
            return { success: false, error: error.message };
        }
    }
}

const bidManager = new BidManager();