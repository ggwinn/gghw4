import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PostListingForm from './PostListingForm';
import ListingDetailModal from './ListingDetailModal';
import './Dashboard.css';
import './NavigationBar.css';

function Dashboard({ name, email, onLogout }) {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showForm, setShowForm] = useState(false);
    const [listings, setListings] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredResults, setFilteredResults] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedListing, setSelectedListing] = useState(null);
    const [sortBy, setSortBy] = useState('');

    useEffect(() => {
        const fetchListings = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get('/search?query=');
                setListings(response.data.listings || []);
                setFilteredResults(response.data.listings || []);
                setError('');
            } catch (error) {
                console.error('Error fetching listings:', error);
                setError('Failed to load listings. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchListings();
    }, []);

    useEffect(() => {
        let currentResults = [...listings];

        if (searchQuery.trim()) {
            currentResults = listings.filter(listing =>
                listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                listing.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                listing.itemType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                listing.condition?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (sortBy === 'price_low_high') {
            currentResults.sort((a, b) => parseFloat(a.pricePerDay) - parseFloat(b.pricePerDay));
        } else if (sortBy === 'price_high_low') {
            currentResults.sort((a, b) => parseFloat(b.pricePerDay) - parseFloat(a.pricePerDay));
        }

        setFilteredResults(currentResults);
    }, [searchQuery, listings, sortBy]);

    const handleListingClick = (listing) => {
        setSelectedListing(listing);
    };

    const handleCloseModal = () => {
        setSelectedListing(null);
    };

    const handleSortChange = (event) => {
        setSortBy(event.target.value);
    };

    const renderPlaceholderContent = () => {
        const placeholders = [/* ... your placeholder data ... */];
        return (
            <div className="listings-grid">
                {placeholders.map((item) => (
                    <div
                        key={item.id}
                        className="listing-card"
                        onClick={() => handleListingClick(item)}
                    >
                        <img src={item.imageURL} alt={item.title} />
                        <div className="listing-info">
                            <h3>{item.title}</h3>
                            <p><strong>Size:</strong> {item.size}</p>
                            <p><strong>Type:</strong> {item.itemType}</p>
                            <p><strong>${item.pricePerDay}/day</strong></p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderDashboardContent = () => (
        <>
            {/* Search Bar */}
            <div className="search-section">
                <input
                    type="text"
                    placeholder="Search by title, size, type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {/* Sorting Options */}
                <select value={sortBy} onChange={handleSortChange} className="sort-dropdown">
                    <option value="">Sort By</option>
                    <option value="price_low_high">Price: Low to High</option>
                    <option value="price_high_low">Price: High to Low</option>
                </select>
            </div>

            {/* Toggle Post Listing Form */}
            <button className="post-listing-btn" onClick={() => setShowForm(!showForm)}>
                {showForm ? "Cancel" : "Post a Listing"}
            </button>

            {/* Show Post Listing Form */}
            {showForm && <PostListingForm email={email} onClose={() => setShowForm(false)} />}

            {/* Clothing Listings Grid */}
            {!showForm && (
                <>
                    <h3>Clothing Listings</h3>
                    {isLoading ? (
                        <p className="status-message">Loading listings...</p>
                    ) : error ? (
                        <div className="error-container">
                            <p className="error-message">{error}</p>
                            {renderPlaceholderContent()}
                        </div>
                    ) : filteredResults.length > 0 ? (
                        <div className="listings-grid">
                            {filteredResults.map((listing) => (
                                <div
                                    key={listing.id}
                                    className="listing-card"
                                    onClick={() => handleListingClick(listing)}
                                >
                                    <img
                                        src={listing.imageURL || "https://via.placeholder.com/300x200?text=No+Image"}
                                        alt={listing.title}
                                    />
                                    <div className="listing-info">
                                        <h3>{listing.title}</h3>
                                        <p><strong>Size:</strong> {listing.size}</p>
                                        <p><strong>Type:</strong> {listing.itemType}</p>
                                        <p><strong>${listing.pricePerDay}/day</strong></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : searchQuery ? (
                        <p className="status-message">No items matching "{searchQuery}" found.</p>
                    ) : (
                        <div>
                            <p className="status-message">No listings available. Be the first to post!</p>
                            {renderPlaceholderContent()}
                        </div>
                    )}
                </>
            )}

            {/* Listing Detail Modal */}
            {selectedListing && (
                <ListingDetailModal
                    listing={selectedListing}
                    onClose={handleCloseModal}
                    userEmail={email}
                />
            )}
        </>
    );

    const renderAboutContent = () => (
        <div className="about-section">
            <h2>About Campus Closet</h2>
            <p className="mission-statement">
                Our mission at Campus Closet is to empower the AUC community by providing a sustainable and accessible platform to rent, buy, sell, and swap clothing. We facilitate sharing for events like Founders Day, everyday needs, and creative expression, fostering community, saving resources, and celebrating individual style.
            </p>
            <p>Welcome to Campus Closet, your go-to clothing swap service within the Atlanta University Center. We're here to help you rent or buy those perfect Founders Day dresses and white attire for your siblings, give a new life to your prom dresses and suits through donation, find that unique Spelman merch for a photoshoot, or simply swap clothes with friends to build community and save a little money. Whether you're looking to buy, rent, sell, or even trade, Campus Closet offers a multitude of options to meet your clothing needs.</p>
            {/* You can add more information about your company here */}
        </div>
    );

    const renderCommunityContent = () => (
        <div className="community-section">
            <h2>Community</h2>
            <p>This is where you would build out community features or information.</p>
            {/* Add your community content here */}
        </div>
    );

    return (
        <div className="dashboard">
            {/* Navigation Bar */}
            <div className="navigation-bar">
                <button
                    className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    Dashboard
                </button>
                <button
                    className={`nav-button ${activeTab === 'about' ? 'active' : ''}`}
                    onClick={() => setActiveTab('about')}
                >
                    About
                </button>
                <button
                    className={`nav-button ${activeTab === 'community' ? 'active' : ''}`}
                    onClick={() => setActiveTab('community')}
                >
                    Community
                </button>
            </div>

            <h2>Welcome, {name}!</h2>

            {/* Render content based on the active tab */}
            {activeTab === 'dashboard' && renderDashboardContent()}
            {activeTab === 'about' && renderAboutContent()}
            {activeTab === 'community' && renderCommunityContent()}

            {/* Logout Button */}
            <button className="logout-btn" onClick={onLogout}>Log Out</button>
        </div>
    );
}

export default Dashboard;