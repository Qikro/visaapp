const express = require('express');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const PaytmChecksum = require('paytm-pg-node-sdk/lib/PaytmChecksum');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8000;

// Paytm credentials from .env file
const paytmMid = process.env.PAYTM_MID;
const paytmMerchantKey = process.env.PAYTM_MERCHANT_KEY;
const paytmWebsite = process.env.PAYTM_WEBSITE || 'WEBSTAGING';


// Utility function to hash passwords
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Utility function to generate JWT-like token
function generateToken(email) {
  return crypto.randomBytes(32).toString('hex') + ':' + email;
}

// Verify token
function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(':');
  if (parts.length !== 2) return null;
  return parts[1];
}

// Admin users storage (in production, use a database)
const adminUsers = [
  {
    email: 'saipesaru06@gmail.com',
    password: hashPassword('admin123'), // Default password, should be changed
    role: 'admin'
  }
];

// Applications storage (in production, use a database)
const applications = [];

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// ============= ADMIN AUTHENTICATION ENDPOINTS =============

// Admin login endpoint
app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const admin = adminUsers.find(u => u.email === email);

  if (!admin || admin.password !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = generateToken(email);
  res.json({ token, email, role: admin.role });
});

// Admin data endpoint (requires authentication)
app.get('/admin/data', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const email = verifyToken(token);

  if (!email || !adminUsers.find(u => u.email === email)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Calculate total earnings
  const totalEarnings = applications.reduce((sum, app) => {
    return sum + (app.paymentStatus === 'completed' ? app.paymentAmount : 0);
  }, 0);

  // Get paid applications
  const paidApplications = applications.filter(app => app.paymentStatus === 'completed');

  // Return admin dashboard data
  res.json({
    totalApplications: applications.length,
    totalUsers: 1, // This would come from Firebase in production
    totalAdmins: adminUsers.length,
    totalEarnings: totalEarnings / 100, // Convert cents to dollars
    paidApplications: paidApplications.length,
    admins: adminUsers.map((admin) => ({
      email: admin.email,
      role: admin.role
    })),
    applications: applications.map(app => ({
      ...app,
      paymentAmount: app.paymentAmount / 100 // Convert cents to dollars
    }))
  });
});

// Add new admin endpoint
app.post('/admin/add-admin', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const email = verifyToken(token);

  if (!email || !adminUsers.find(u => u.email === email)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { email: newEmail, password } = req.body;

  if (!newEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Check if admin already exists
  if (adminUsers.find(u => u.email === newEmail)) {
    return res.status(400).json({ error: 'Admin with this email already exists.' });
  }

  // Add new admin
  adminUsers.push({
    email: newEmail,
    password: hashPassword(password),
    role: 'admin'
  });

  res.json({ message: 'Admin added successfully', email: newEmail });
});

// Endpoint to submit application (called from main app)
app.post('/submit-application', (req, res) => {
  const { name, email, visaType, files, photoFile } = req.body; 

  if (!name || !email || !visaType) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  
  const application = {
    id: crypto.randomBytes(8).toString('hex'),
    name,
    email,
    visaType,
    filesCount: files ? files.length : 0,
    hasPhoto: !!photoFile,
    submittedAt: new Date().toISOString(),
    paymentStatus: 'pending',
    paymentAmount: 0,
    paidAt: null
  };

  applications.push(application);
  res.json({ success: true, applicationId: application.id });
});

// Endpoint to record payment
app.post('/record-payment', (req, res) => {
  const { email, amount, stripeSessionId } = req.body;

  if (!email || !amount) {
    return res.status(400).json({ error: 'Email and amount are required.' });
  }

  // Find the most recent application for this email
  const application = applications
    .filter(a => a.email === email)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];

  if (!application) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  // Update application with payment info
  application.paymentStatus = 'completed';
  application.paymentAmount = amount;
  application.paidAt = new Date().toISOString();
  application.stripeSessionId = stripeSessionId;

  res.json({ success: true, applicationId: application.id });
});

// Test endpoint to add sample payment (for demo purposes)
app.post('/admin/test-payment', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const email = verifyToken(token);

  if (!email || !adminUsers.find(u => u.email === email)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { userEmail, amount } = req.body;

  if (!userEmail || !amount) {
    return res.status(400).json({ error: 'Email and amount are required.' });
  }

  // Find the most recent application for this email or create test one
  let application = applications
    .filter(a => a.email === userEmail)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];

  if (!application) {
    // Create test application
    application = {
      id: crypto.randomBytes(8).toString('hex'),
      name: 'Test User',
      email: userEmail,
      visaType: 'digital-nomad',
      filesCount: 0,
      hasPhoto: false,
      submittedAt: new Date().toISOString(),
      paymentStatus: 'completed',
      paymentAmount: amount * 100, // Convert to cents
      paidAt: new Date().toISOString()
    };
    applications.push(application);
  } else {
    application.paymentStatus = 'completed';
    application.paymentAmount = amount * 100; // Convert to cents
    application.paidAt = new Date().toISOString();
  }

  res.json({ success: true, applicationId: application.id });
});

// ============= PAYTM ENDPOINTS =============

app.post('/initiate-payment', (req, res) => {
  if (!paytmMid || !paytmMerchantKey) {
    return res.status(500).json({ error: 'Paytm credentials are not configured.' });
  }

  const { applicationId } = req.body;
  const application = applications.find(a => a.id === applicationId);

  if (!application) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  const orderId = applicationId;
  const amount = "10.00"; // Amount in INR for Paytm

  const paytmParams = {};
  paytmParams.body = {
    "requestType": "Payment",
    "mid": paytmMid,
    "websiteName": paytmWebsite,
    "orderId": orderId,
    "callbackUrl": `${req.protocol}://${req.get('host')}/paytm-callback`,
    "txnAmount": {
      "value": amount,
      "currency": "INR",
    },
    "userInfo": {
      "custId": application.email,
    },
  };

  PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), paytmMerchantKey).then(function(checksum) {
    paytmParams.head = { "signature": checksum };
    const post_data = JSON.stringify(paytmParams);

    const options = {
      hostname: 'securegw-stage.paytm.in', // Use 'securegw.paytm.in' for production
      port: 443,
      path: `/theia/api/v1/initiateTransaction?mid=${paytmMid}&orderId=${orderId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': post_data.length
      }
    };

    let response = "";
    const post_req = https.request(options, function(post_res) {
      post_res.on('data', function(chunk) { response += chunk; });
      post_res.on('end', function() {
        const responseBody = JSON.parse(response);
        if (responseBody.body && responseBody.body.resultInfo.resultStatus === 'S') {
          res.json({
            txnToken: responseBody.body.txnToken,
            orderId: orderId,
            mid: paytmMid,
            amount: amount
          });
        } else {
          console.error("Paytm initiate transaction error:", responseBody);
          res.status(500).json({ error: 'Failed to initiate Paytm transaction.', details: responseBody });
        }
      });
    });

    post_req.write(post_data);
    post_req.end();
  }).catch(err => {
    console.error("Checksum generation error:", err);
    res.status(500).json({ error: 'Failed to generate payment signature.' });
  });
});

app.post('/paytm-callback', (req, res) => {
  const form = req.body;
  const paytmChecksum = form.CHECKSUMHASH;
  delete form.CHECKSUMHASH;

  const isVerifySignature = PaytmChecksum.verifySignature(form, paytmMerchantKey, paytmChecksum);
  if (isVerifySignature) {
    const orderId = form.ORDERID;
    const application = applications.find(a => a.id === orderId);

    if (application) {
      if (form.STATUS === 'TXN_SUCCESS') {
        application.paymentStatus = 'completed';
        application.paymentAmount = parseFloat(form.TXNAMOUNT) * 100;
        application.paidAt = form.TXNDATE;
      } else {
        application.paymentStatus = 'failed';
      }
    }
    res.status(200).send('Callback received.');
  } else {
    res.status(400).send('Checksum mismatch.');
  }
});

app.get('/payment-status', (req, res) => {
  const { applicationId } = req.query;
  if (!applicationId) return res.status(400).json({ error: 'Application ID is required.' });

  const application = applications.find(a => a.id === applicationId);
  if (!application) return res.status(404).json({ status: 'not_found' });

  res.json({ status: application.paymentStatus });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  if (!paytmMerchantKey) {
    console.warn('Warning: Paytm credentials (PAYTM_MID, PAYTM_MERCHANT_KEY) are not set. Payment will not work.');
  }
});
