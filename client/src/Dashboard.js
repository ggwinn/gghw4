import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PostListingForm from './PostListingForm';
import ListingDetailModal from './ListingDetailModal';
import './Dashboard.css'; // Reusing Dashboard styles

/**
 * Dashboard Component
 *
 * This component renders the main dashboard for logged-in users.
 * It displays a search bar, a button to toggle the post listing form,
 * a grid of available listings, and handles the display of listing details in a modal.
 *
 * @component
 * @param {string} name - The name of the logged-in user.
 * @param {string} email - The email of the logged-in user.
 * @param {function} onLogout - A function to call when the user logs out.
 * @returns {JSX.Element} The Dashboard component.
 */
function Dashboard({ name, email, onLogout }) {
    const [showForm, setShowForm] = useState(false);
    /** @type {boolean} Controls the visibility of the PostListingForm. */

    const [listings, setListings] = useState([]);
    /** @type {Array<object>} An array of all available listings fetched from the backend. */

    const [searchQuery, setSearchQuery] = useState('');
    /** @type {string} The current search query entered by the user. */

    const [filteredResults, setFilteredResults] = useState([]);
    /** @type {Array<object>} An array of listings filtered based on the search query. */

    const [isLoading, setIsLoading] = useState(true);
    /** @type {boolean} Indicates whether the listings data is currently being loaded. */

    const [error, setError] = useState('');
    /** @type {string} An error message to display if fetching listings fails. */

    const [selectedListing, setSelectedListing] = useState(null);
    /** @type {object | null} The listing object that is currently selected for detailed view in the modal. */

    /**
     * Fetches the initial listings data from the backend when the component mounts.
     * @effect
     */
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

    /**
     * Filters the listings based on the search query.
     * @effect
     * @dependency {searchQuery}
     * @dependency {listings}
     */
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredResults(listings);
            return;
        }

        // Filter listings based on title, size, itemType, or condition.
        const filtered = listings.filter(listing =>
            listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            listing.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            listing.itemType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            listing.condition?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        setFilteredResults(filtered);
    }, [searchQuery, listings]);

    /**
     * Handles clicking on a listing to open the detail modal.
     * @function handleListingClick
     * @param {object} listing - The listing object that was clicked.
     * @returns {void}
     */
    const handleListingClick = (listing) => {
        setSelectedListing(listing);
    };

    /**
     * Closes the listing detail modal.
     * @function handleCloseModal
     * @returns {void}
     */
    const handleCloseModal = () => {
        setSelectedListing(null);
    };

    /**
     * Renders placeholder content when no listings are available (for visual testing).
     * @function renderPlaceholderContent
     * @returns {JSX.Element} The placeholder content.
     */
    const renderPlaceholderContent = () => {
        // Sample placeholder data for visual testing
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
                phone_number: '123-456-7890', // Added placeholder
                contact_email: 'placeholder1@example.com' // Added placeholder
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
                phone_number: '987-654-3210', // Added placeholder
                contact_email: 'placeholder2@example.com' // Added placeholder
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
                phone_number: '555-123-4567', // Added placeholder
                contact_email: 'placeholder3@example.com' // Added placeholder
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

    return (
        <div className="dashboard">
            <h2>Welcome, {name}!</h2>

            {/* Search Bar */}
            <div className="search-section">
                <input
                    type="text"
                    placeholder="Search by title, size, type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
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

            {/* Logout Button */}
            <button className="logout-btn" onClick={onLogout}>Log Out</button>
        </div>
    );
}

export default Dashboard;