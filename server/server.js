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

app.post('/register', async (req, res) => { /* ... your registration code ... */ });
app.post('/login', async (req, res) => { /* ... your login code ... */ });
app.post('/verify', async (req, res) => { /* ... your verification code ... */ });

// ========================================================
// Clothing Listings API
// ========================================================

// Endpoint to post a new clothing listing
app.post('/listings', upload.single('image'), async (req, res) => {
  const { title, size, itemType, condition, washInstructions, startDate, endDate, pricePerDay, totalPrice, phoneNumber, contactEmail, rentalType } = req.body;
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
    rentalType,
    pricePerDay,
    totalPrice,
    hasFile: !!file,
    phoneNumber,
    contactEmail
  });

  if (!userEmail) {
    return res.status(401).json({ success: false, message: 'User authentication required' });
  }

  try {
    const { data: authData, error: authError } = await supabase.auth
      .admin.listUsers();

    if (authError) {
      console.error("Error listing users:", authError);
      throw authError;
    }

    const user = authData.users.find(u => u.email === userEmail);
    if (!user) {
      console.error("User not found with email:", userEmail);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userId = user.id;
    console.log("Found user ID:", userId);

    let imageURL = null;

    if (file) {
      const fileName = `${Date.now()}_${file.originalname}`;
      console.log("Uploading file:", fileName);

      const { data: fileData, error: fileError } = await supabase.storage
        .from('clothing-images')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (fileError) {
        console.error("File upload error:", fileError);
        throw fileError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('clothing-images')
        .getPublicUrl(fileName);

      imageURL = publicUrlData.publicUrl;
      console.log("File uploaded successfully, URL:", imageURL);
    }

    console.log("Attempting insert with UUID:", userId);

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
        rental_type: rentalType, // Store rental type
        pricePerDay: rentalType === 'rent' ? parseFloat(pricePerDay) : null, // Store price if rent, otherwise null
        imageURL,
        phone_number: phoneNumber,
        contact_email: contactEmail,
      }])
      .select();

    if (error) {
      console.error("Supabase error details:", error);
      throw error;
    }

    console.log("Insert successful, returned data:", data);
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
      .select('*');

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

    // Get listing details to check if it's a paid rental
    const { data: listingData, error: listingError } = await supabase
      .from('listings')
      .select('rental_type')
      .eq('id', listingId)
      .single();

    if (listingError) throw listingError;
    if (!listingData || listingData.rental_type !== 'rent') { // Ensure rental_type is 'rent'
      return res.status(400).json({ success: false, message: 'Payment is not required for this listing.' });
    }

    // Get listing details
    const { data: fullListingData, error: fullListingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (fullListingError) throw fullListingError;
    if (!fullListingData) {
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
      note: `Rental payment for ${fullListingData.title}`,
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

      // Optional: Send confirmation email
      // await sendConfirmationEmail(userEmail, fullListingData, new Date(startDate), new Date(endDate), amount, rentalId);

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
          pricePerDay,
          rental_type
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
// NEW: Verification Code Exchange API Endpoint for Free Rentals
// ========================================================
app.post('/api/exchange-verification', async (req, res) => {
  // TODO: Implement logic for exchanging verification codes
  // This might involve:
  // 1. Receiving a verification code from one user.
  // 2. Associating it with the listing and the users involved.
  // 3. Potentially notifying the other user.
  // 4. Updating the rental status (if you choose to track it).

  const { listingId, senderId, recipientId, verificationCode } = req.body;

  console.log("Received verification code exchange request:", { listingId, senderId, recipientId, verificationCode });

  // Example response (you'll need to implement the actual logic)
  res.status(501).json({ success: false, message: 'Verification code exchange logic not yet implemented' });
});

// Helper function to send confirmation email (commented out)
// async function sendConfirmationEmail(email, listing, startDate, endDate, amount, rentalId) { ... }

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