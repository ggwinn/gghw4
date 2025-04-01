const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const multer = require('multer');
const { ApiError, Client, Environment } = require('square');
const { randomUUID } = require('crypto');
const cors = require('cors');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === 'production'
    ? Environment.Production
    : Environment.Sandbox
});

const app = express();
app.use(express.json());
app.use(cors());

// Set up multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Serve static files from React build folder
app.use(express.static(path.join(__dirname, '../client/build')));

// ========================================================
// Authentication Routes using Supabase Auth
// ========================================================

app.post('/register', async (req, res) => {
    // ... your register route ...
});

app.post('/login', async (req, res) => {
    // ... your login route ...
});

app.post('/verify', async (req, res) => {
    // ... your verify route ...
});

// ========================================================
// Clothing Listings API
// ========================================================

app.post('/listings', upload.single('image'), async (req, res) => {
  const { title, size, itemType, condition, washInstructions, startDate, endDate, pricePerDay, totalPrice, phoneNumber, contactEmail } = req.body;
  const { file } = req;
  const userEmail = req.headers['user-id'];

  console.log("Received listing data:", {
      userEmail,
      title,
      size,
      itemType,
      condition,
      washInstructions,
      startDate,
      endDate,
      pricePerDay,
      hasFile: !!file,
      phoneNumber,
      contactEmail
  });

  if (!userEmail) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
  }

  try {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;
      const user = authData.users.find(u => u.email === userEmail);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      const userId = user.id;

      let imageURL = null;
      if (file) {
          const fileName = `${Date.now()}_${file.originalname}`;
          const { data: fileData, error: fileError } = await supabase.storage
              .from('clothing-images')
              .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
          if (fileError) throw fileError;
          const { data: publicUrlData } = supabase.storage
              .from('clothing-images')
              .getPublicUrl(fileName);
          imageURL = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase
          .from('listings')
          .insert([{
              user: userId,
              title,
              size,
              itemType,
              condition,
              washInstructions,
              startDate,
              endDate,
              pricePerDay,
              imageURL,
              phone_number: phoneNumber, // Include phone number
              contact_email: contactEmail // Include contact email
          }])
          .select('id, user, title, size, itemType, condition, washInstructions, startDate, endDate, pricePerDay, imageURL, phone_number, contact_email'); // Select fields to return

      if (error) throw error;
      res.json({ success: true, message: 'Listing posted successfully', listing: data[0] });
  } catch (error) {
      console.error("Full error object:", error);
      res.status(500).json({ success: false, message: error.message || 'Error posting listing' });
  }
});

// Search Listings Endpoint
app.get('/search', async (req, res) => {
  const { query = '' } = req.query;
  console.log(`Received search request for: ${query}`);

  try {
      let dbQuery = supabase
          .from('listings')
          .select('id, title, size, itemType, condition, washInstructions, startDate, endDate, pricePerDay, imageURL'); // Exclude phone_number and contact_email

      // Only add filter if query is not empty
      if (query.trim()) {
          dbQuery = dbQuery.or(`title.ilike.%${query}%,size.ilike.%${query}%,itemType.ilike.%${query}%,condition.ilike.%${query}%`);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;

      res.json({ success: true, listings: data });
  } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ success: false, message: error.message || 'Error searching listings' });
  }
});

// ========================================================
// NEW: Rental and Payment API Endpoints
// ========================================================

/**
 * GET /api/rental-contact-info/:rentalId
 *
 * Endpoint to fetch the seller's contact information after a successful rental.
 * Requires authentication to ensure only the buyer who made the rental can access it.
 *
 * @route GET /api/rental-contact-info/:rentalId
 * @param {object} req - The Express request object.
 * @param {string} req.params.rentalId - The ID of the rental.
 * @param {string} req.headers.user-id - The email of the user making the request (for authentication).
 * @param {object} res - The Express response object.
 * @returns {object} JSON response containing the seller's phone number and email if the rental is confirmed.
 * - {boolean} success - Whether the contact information was fetched successfully.
 * - {string} [phone_number] - The seller's phone number.
 * - {string} [contact_email] - The seller's contact email.
 */
app.get('/api/rental-contact-info/:rentalId', async (req, res) => {
  const { rentalId } = req.params;
  const userEmail = req.headers['user-id']; // Assuming you're using user-id for auth

  if (!userEmail) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
      // Get user ID from email
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const user = authData.users.find(u => u.email === userEmail);
      if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
      }

      const userId = user.id;

      // Verify the user making the request is the renter and the rental is confirmed
      const { data: rental, error: rentalError } = await supabase
          .from('rentals')
          .select('status, listing_id')
          .eq('id', rentalId)
          .eq('renter_id', userId)
          .single();

      if (rentalError || !rental) {
          return res.status(404).json({ success: false, message: 'Rental not found or unauthorized' });
      }

      if (rental.status !== 'confirmed' && rental.status !== 'success') {
          return res.status(403).json({ success: false, message: 'Contact information available after successful rental' });
      }

      // Get the listing details, including contact info
      const { data: listing, error: listingError } = await supabase
          .from('listings')
          .select('phone_number, contact_email')
          .eq('id', rental.listing_id)
          .single();

      if (listingError || !listing) {
          return res.status(404).json({ success: false, message: 'Listing not found' });
      }

      res.json({ success: true, phone_number: listing.phone_number, contact_email: listing.contact_email });

  } catch (error) {
      console.error('Error fetching contact info:', error);
      res.status(500).json({ success: false, message: 'Error fetching contact information' });
  }
});

// Process payment and create rental record
app.post('/api/process-payment', async (req, res) => {
  try {
    const { sourceId, amount, listingId, startDate, endDate, userEmail } = req.body;

    if (!sourceId || !amount || !listingId || !startDate || !endDate || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment information'
      });
    }

    console.log(`Processing payment: $${amount} for listing ${listingId}`);

    // Get user ID from email
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const user = authData.users.find(u => u.email === userEmail);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userId = user.id;

    // Get listing details
    const { data: listingData, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError) throw listingError;
    if (!listingData) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    // Create a unique idempotency key for this payment
    const idempotencyKey = randomUUID();

    // Convert amount to cents for Square API
    const amountInCents = Math.round(parseFloat(amount) * 100);

    // Process the payment with Square
    const payment = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey,
      amountMoney: {
        amount: amountInCents,
        currency: 'USD'
      },
      // Add metadata about the transaction
      note: `Rental payment for ${listingData.title}`,
      // Include reference ID for your database
      referenceId: String(listingId)
    });

    if (payment.result && payment.result.payment) {
      // Payment was successful
      console.log('Payment successful:', payment.result.payment.id);

      // Create rental record in Supabase
      const { data: rentalData, error: rentalError } = await supabase
        .from('rentals')
        .insert([{
          listing_id: listingId,
          renter_id: userId,
          start_date: startDate,
          end_date: endDate,
          total_amount: amount,
          payment_id: payment.result.payment.id,
          status: 'confirmed'
        }])
        .select();

      if (rentalError) throw rentalError;

      const rentalId = rentalData[0].id;

      return res.json({
        success: true,
        paymentId: payment.result.payment.id,
        rentalId
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Payment processing failed'
      });
    }
  } catch (error) {
    console.error('Payment error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during payment processing'
    });
  }
});

// Get user's rental history
app.get('/api/rentals', async (req, res) => {
  const userEmail = req.headers['user-id'];

  if (!userEmail) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    // Get user ID from email
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const user = authData.users.find(u => u.email === userEmail);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userId = user.id;

    // Get rentals with listing details
    const { data, error } = await supabase
      .from('rentals')
      .select(`
        *,
        listing:listing_id (
          title,
          size,
          itemType,
          imageURL,
          pricePerDay
        )
      `)
      .eq('renter_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, rentals: data });
  } catch (error) {
    console.error('Error fetching rentals:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching rental history' });
  }
});

// ========================================================
// Serve React Frontend
// ========================================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});