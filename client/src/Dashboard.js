import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PostListingForm from './PostListingForm';
import ListingDetailModal from './ListingDetailModal';
import './Dashboard.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function Dashboard({ email }) {
    const [listings, setListings] = useState([]);
    const [isPosting, setIsPosting] = useState(false);
    const [selectedListing, setSelectedListing] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchStartDate, setSearchStartDate] = useState(null);
    const [searchEndDate, setSearchEndDate] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [activeTab, setActiveTab] = useState('community'); // 'community', 'listings', 'rentals'
    const [userRentals, setUserRentals] = useState([]);

    useEffect(() => {
        fetchListings();
        fetchUserRentals();
    }, []);

    const fetchListings = async () => {
        try {
            const response = await axios.get('/listings');
            setListings(response.data.listings);
        } catch (error) {
            console.error('Error fetching listings:', error);
        }
    };

    const fetchUserRentals = async () => {
        try {
            const response = await axios.get('/api/rentals', {
                headers: { 'user-id': email }
            });
            setUserRentals(response.data.rentals);
        } catch (error) {
            console.error('Error fetching user rentals:', error);
        }
    };

    const handlePostListingClick = () => {
        setIsPosting(true);
    };

    const handleClosePostListingForm = () => {
        setIsPosting(false);
        fetchListings(); // Refresh listings after posting
    };

    const handleListingClick = (listing) => {
        setSelectedListing(listing);
    };

    const handleCloseListingModal = () => {
        setSelectedListing(null);
        fetchListings(); // Refresh listings after interaction
        fetchUserRentals(); // Refresh rentals after interaction
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleSearchDateChange = (dates) => {
        const [start, end] = dates;
        setSearchStartDate(start);
        setSearchEndDate(end);
    };

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.get('/search', {
                params: { query: searchQuery, startDate: searchStartDate, endDate: searchEndDate }
            });
            setSearchResults(response.data.listings);
            setActiveTab('community'); // Switch to community tab to show search results
        } catch (error) {
            console.error('Error searching listings:', error);
        }
    };

    const listingsToDisplay = activeTab === 'community' ? searchResults.length > 0 ? searchResults : listings : listings;

    const renderCommunityContent = () => (
        <div>
            <h2>Community Listings</h2>
            <form onSubmit={handleSearchSubmit} className="search-form">
                <input
                    type="text"
                    placeholder="Search by title, size, type, condition"
                    value={searchQuery}
                    onChange={handleSearchChange}
                />
                <DatePicker
                    selectsRange
                    startDate={searchStartDate}
                    endDate={searchEndDate}
                    onChange={handleSearchDateChange}
                    placeholderText="Select Date Range"
                    className="date-range-picker"
                />
                <button type="submit">Search</button>
            </form>
            <div className="listings-grid">
                {listingsToDisplay.map(listing => (
                    <div key={listing.id} className="listing-card" onClick={() => handleListingClick(listing)}>
                        <img src={listing.imageURL} alt={listing.title} />
                        <h3>{listing.title}</h3>
                        <p>Size: {listing.size}</p>
                        <p>Type: {listing.itemType}</p>
                        <p>Price: ${listing.pricePerDay}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderListingsTab = () => (
        <div>
            <h2>Your Listings</h2>
            <button onClick={handlePostListingClick}>Post a New Listing</button>
            <div className="listings-grid">
                {listings.filter(listing => listing.user === email).map(listing => (
                    <div key={listing.id} className="listing-card" onClick={() => handleListingClick(listing)}>
                        <img src={listing.imageURL} alt={listing.title} />
                        <h3>{listing.title}</h3>
                        <p>Size: {listing.size}</p>
                        <p>Type: {listing.itemType}</p>
                        <p>Price: ${listing.pricePerDay}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderRentalsTab = () => (
        <div>
            <h2>Your Rentals</h2>
            {userRentals.length > 0 ? (
                <div className="rentals-list">
                    {userRentals.map(rental => (
                        <div key={rental.id} className="rental-item">
                            {rental.listing && (
                                <>
                                    <h3>{rental.listing.title}</h3>
                                    <p>Rented from: {new Date(rental.start_date).toLocaleDateString()} to {new Date(rental.end_date).toLocaleDateString()}</p>
                                    <p>Total Paid: ${rental.total_amount}</p>
                                    {/* Add more details as needed */}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p>No rentals yet.</p>
            )}
        </div>
    );

    return (
        <div className="dashboard">
            <div className="dashboard-nav">
                <button
                    className={activeTab === 'community' ? 'active' : ''}
                    onClick={() => setActiveTab('community')}
                >
                    Community
                </button>
                <button
                    className={activeTab === 'listings' ? 'active' : ''}
                    onClick={() => setActiveTab('listings')}
                >
                    Your Listings
                </button>
                <button
                    className={activeTab === 'rentals' ? 'active' : ''}
                    onClick={() => setActiveTab('rentals')}
                >
                    Your Rentals
                </button>
            </div>

            <div className="dashboard-content">
                {activeTab === 'community' && renderCommunityContent()}
                {activeTab === 'listings' && renderListingsTab()}
                {activeTab === 'rentals' && renderRentalsTab()}
            </div>

            {isPosting && <PostListingForm email={email} onClose={handleClosePostListingForm} />}
            {selectedListing && <ListingDetailModal listing={selectedListing} onClose={handleCloseListingModal} userEmail={email} />}
        </div>
    );
}

export default Dashboard;