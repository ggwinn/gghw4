import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PostListingForm from './PostListingForm';
import ListingDetailModal from './ListingDetailModal';
import './Dashboard.css'; // Reusing Dashboard styles
import './NavigationBar.css'; // New CSS file for navigation bar

/**
 * Dashboard Component
 *
 * This component renders the main dashboard for logged-in users, now with navigation tabs.
 * It displays a search bar, a button to toggle the post listing form,
 * a grid of available listings, and handles the display of listing details in a modal.
 * It also includes tabs for 'About' and 'Community'.
 *
 * @component
 * @param {string} name - The name of the logged-in user.
 * @param {string} email - The email of the logged-in user.
 * @param {function} onLogout - A function to call when the user logs out.
 * @returns {JSX.Element} The Dashboard component.
 */
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
        const placeholders = [
            {
                id: 'placeholder-1',
                title: 'Blue Denim Jacket',
                size: 'M',
                itemType: 'Jacket',
                pricePerDay: '5.99',
                imageURL: 'https://via.placeholder.com/300x200?text=Denim+Jacket',
                condition: 'Like new',
                washInstructions: 'Machine wash cold',
                startDate: new Date(2023, 5, 1).toISOString(),
                endDate: new Date(2023, 8, 30).toISOString(),
                phone_number: '123-456-7890',
                contact_email: 'placeholder1@example.com'
            },
            {
                id: 'placeholder-2',
                title: 'Black Jeans',
                size: 'L',
                itemType: 'Jeans',
                pricePerDay: '3.50',
                imageURL: 'https://via.placeholder.com/300x200?text=Black+Jeans',
                condition: 'Good',
                washInstructions: 'Machine wash cold, tumble dry low',
                startDate: new Date(2023, 5, 1).toISOString(),
                endDate: new Date(2023, 8, 30).toISOString(),
                phone_number: '987-654-3210',
                contact_email: 'placeholder2@example.com'
            },
            {
                id: 'placeholder-3',
                title: 'Summer Dress',
                size: 'S',
                itemType: 'Dress',
                pricePerDay: '6.00',
                imageURL: 'https://via.placeholder.com/300x200?text=Summer+Dress',
                condition: 'New with tags',
                washInstructions: 'Hand wash only',
                startDate: new Date(2023, 5, 1).toISOString(),
                endDate: new Date(2023, 8, 30).toISOString(),
                phone_number: '555-123-4567',
                contact_email: 'placeholder3@example.com'
            }
        ];

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

            {/* Listings Grid */}
            {!showForm && (
                <>
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
            <p>This is where you would put information about your company.</p>
            {/* Add your about us content here */}
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

            {/* Logout Button (keep it at the bottom) */}
            <button className="logout-btn" onClick={onLogout}>Log Out</button>
        </div>
    );
}

export default Dashboard;