class BidManager {
    constructor() {
        this.bids = this.loadBids();
        this.currentUser = this.getCurrentUser();
    }

    // Get current user from localStorage
    getCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    }

    // Load bids from localStorage
    loadBids() {
        const bidsData = localStorage.getItem('bids');
        return bidsData ? JSON.parse(bidsData) : [];
    }

    // Save bids to localStorage
    saveBids() {
        localStorage.setItem('bids', JSON.stringify(this.bids));
    }

    // Generate unique bid ID
    generateBidId() {
        return 'BID-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Create a new bid
    createBid(lotNumber, maxBid, depositAmount = 0) {
        if (!this.currentUser) {
            throw new Error('User must be logged in to place a bid');
        }

        const bid = {
            id: this.generateBidId(),
            userId: this.currentUser.id,
            lotNumber: lotNumber.toUpperCase().trim(),
            maxBid: parseFloat(maxBid),
            depositAmount: parseFloat(depositAmount),
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.bids.push(bid);
        this.saveBids();
        return bid;
    }

    // Get all bids for current user
    getUserBids() {
        if (!this.currentUser) {
            return [];
        }
        return this.bids.filter(bid => bid.userId === this.currentUser.id);
    }

    // Get bid by ID
    getBidById(bidId) {
        return this.bids.find(bid => bid.id === bidId);
    }

    // Update bid
    updateBid(bidId, updates) {
        const bidIndex = this.bids.findIndex(bid => bid.id === bidId);
        if (bidIndex === -1) {
            throw new Error('Bid not found');
        }

        this.bids[bidIndex] = {
            ...this.bids[bidIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveBids();
        return this.bids[bidIndex];
    }

    // Delete bid
    deleteBid(bidId) {
        const bidIndex = this.bids.findIndex(bid => bid.id === bidId);
        if (bidIndex === -1) {
            throw new Error('Bid not found');
        }

        this.bids.splice(bidIndex, 1);
        this.saveBids();
        return true;
    }

    // Calculate deposit amount (10% for bids over $2500)
    calculateDeposit(maxBid) {
        const amount = parseFloat(maxBid);
        return amount > 2500 ? amount * 0.10 : 0;
    }

    // Get bids by status
    getBidsByStatus(status) {
        if (!this.currentUser) {
            return [];
        }
        return this.getUserBids().filter(bid => bid.status === status);
    }

    // Get total bids count
    getTotalBidsCount() {
        return this.getUserBids().length;
    }

    // Get total active bids (pending)
    getActiveBidsCount() {
        return this.getBidsByStatus('pending').length;
    }

    // Get total won bids
    getWonBidsCount() {
        return this.getBidsByStatus('won').length;
    }

    // Get total lost bids
    getLostBidsCount() {
        return this.getBidsByStatus('lost').length;
    }

    // Format bid for display
    formatBid(bid) {
        return {
            ...bid,
            formattedMaxBid: new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(bid.maxBid),
            formattedDeposit: new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(bid.depositAmount),
            formattedDate: new Date(bid.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        };
    }

    // Get statistics
    getStatistics() {
        const userBids = this.getUserBids();
        const totalBids = userBids.length;
        const activeBids = userBids.filter(bid => bid.status === 'pending').length;
        const wonBids = userBids.filter(bid => bid.status === 'won').length;
        const lostBids = userBids.filter(bid => bid.status === 'lost').length;

        return {
            totalBids,
            activeBids,
            wonBids,
            lostBids,
            successRate: totalBids > 0 ? (wonBids / totalBids * 100).toFixed(1) : 0
        };
    }

    // Clear all bids (for testing/debugging)
    clearAllBids() {
        this.bids = [];
        this.saveBids();
    }
}

// Initialize global bid manager instance
window.bidManager = new BidManager();