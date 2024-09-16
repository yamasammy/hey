const express = require('express');
const path = require('path'); // Import path module to handle file paths
const db = require('./config/db'); // Import the database connection
const bodyParser = require('body-parser'); // Import body-parser
const QRCode = require('qrcode'); // Import the QRCode library
const fs = require('fs'); // Import fs to handle file system operations

// Initialize the Express app
const app = express();

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Set the directory for EJS views
app.set('views', path.join(__dirname, 'views'));

// Use body-parser to parse form data
app.use(bodyParser.urlencoded({ extended: false }));

// Define the root route to render the EJS template
app.get('/', (req, res) => {
  res.render('index', { title: 'Welcome to LionelV2' }); // Render 'index.ejs' with a title variable
});

// Add this route to handle the '/settings' page
app.get('/settings', (req, res) => {
  const { productId, productName, entryQR, exitQR } = req.query;

  res.render('settings', {
    title: 'Settings Page',
    productId,
    productName,
    entryQR,
    exitQR
  });
});

// Utility function to handle QR code downloads
function downloadQRCode(res, productId, type) {
  const qrCodePath = path.join(__dirname, 'qrcodes', `${type}_${productId}.png`);
  res.download(qrCodePath, `${type}_${productId}.png`, (err) => {
    if (err) {
      console.error(`Error downloading ${type} QR code:`, err.message, err.stack);
      return res.status(500).send(`Failed to download ${type} QR code.`);
    }
  });
}

// Utility function to handle stock transactions (entry/exit)
function handleStockTransaction(res, productId, transactionType) {
  const productQuery = `SELECT Products.id, Products.name, Products.packaging_type, Stock.stock_level
                        FROM Products
                        JOIN Stock ON Products.id = Stock.product_id
                        WHERE Products.id = ?`;

  db.query(productQuery, [productId], (err, results) => {
    if (err) {
      console.error(`Error fetching product details for ${transactionType}:`, err.message, err.stack);
      return res.status(500).send('Failed to fetch product details.');
    }

    if (results.length === 0) {
      return res.status(404).send('Product not found.');
    }

    const product = results[0];
    const stockLevel = product.stock_level;

    if (transactionType === 'exit') {
      // Fetch chantier names for stock exit
      const chantierQuery = 'SELECT id, chantier_nom FROM chantier';
      db.query(chantierQuery, (err, chantierResults) => {
        if (err) {
          console.error('Error fetching chantier data:', err.message, err.stack);
          return res.status(500).send('Failed to fetch chantier data.');
        }

        const chantierList = chantierResults;
        // Render the product page for stock exit with chantier list
        res.render('product', {
          product,
          stockLevel,
          transactionType,
          chantierList
        });
      });
    } else {
      // Render the product page for stock entry (no chantier list needed)
      res.render('product', {
        product,
        stockLevel,
        transactionType,
        chantierList: [] // Empty list for stock entry
      });
    }
  });
}

// POST route to handle form submission for adding a product
app.post('/add-product', (req, res) => {
  console.log('Form submission received:', req.body);

  const { productName, initialStock } = req.body;
  const packagingType = req.body['packagingType[]'];

  if (!productName || !packagingType || initialStock === undefined) {
    console.error('Validation Error: Missing required fields.');
    return res.status(400).send('All fields are required.');
  }

  const packagingTypeString = Array.isArray(packagingType) ? packagingType.join(', ') : packagingType;

  const insertProductQuery = `INSERT INTO Products (name, packaging_type) VALUES (?, ?)`;
  db.query(insertProductQuery, [productName, packagingTypeString], (err, productResult) => {
    if (err) {
      console.error('Error inserting product:', err.message, err.stack);
      return res.status(500).send('Failed to add product.');
    }

    const productId = productResult.insertId;

    const insertStockQuery = `INSERT INTO Stock (product_id, stock_level) VALUES (?, ?)`;
    db.query(insertStockQuery, [productId, initialStock], (err, stockResult) => {
      if (err) {
        console.error('Error inserting stock:', err.message, err.stack);
        return res.status(500).send('Failed to add stock.');
      }

      console.log(`Product added successfully with ID: ${productId}`);
      console.log(`Stock added successfully for product ID: ${productId}`);

      // Generate QR codes for stock entry and stock exit
      const entryUrl = `http://localhost:3000/stock-entry/${productId}`;
      const exitUrl = `http://localhost:3000/stock-exit/${productId}`;
      const qrCodeDir = path.join(__dirname, 'qrcodes');

      // Generate QR code for entry (PNG file and Data URL)
      const entryQRPath = path.join(qrCodeDir, `entry_${productId}.png`);
      QRCode.toFile(entryQRPath, entryUrl, {
        color: {
          dark: '#00FF00', // Green QR code shape (foreground)
          light: '#FFFFFF' // White background
        },
        width: 512 // Set the size to 512x512px
      }, (err) => {
        if (err) {
          console.error('Error generating entry QR code:', err.message, err.stack);
          return res.status(500).send('Failed to generate entry QR code.');
        }

        QRCode.toDataURL(entryUrl, { width: 512 }, (err, entryQR) => {
          if (err) {
            console.error('Error generating entry QR code (Data URL):', err.message, err.stack);
            return res.status(500).send('Failed to generate entry QR code (Data URL).');
          }

          // Generate QR code for exit (PNG file and Data URL)
          const exitQRPath = path.join(qrCodeDir, `exit_${productId}.png`);
          QRCode.toFile(exitQRPath, exitUrl, {
            color: {
              dark: '#FF0000', // Red QR code shape (foreground)
              light: '#FFFFFF' // White background
            },
            width: 512 // Set the size to 512x512px
          }, (err) => {
            if (err) {
              console.error('Error generating exit QR code:', err.message, err.stack);
              return res.status(500).send('Failed to generate exit QR code.');
            }

            QRCode.toDataURL(exitUrl, { width: 512 }, (err, exitQR) => {
              if (err) {
                console.error('Error generating exit QR code (Data URL):', err.message, err.stack);
                return res.status(500).send('Failed to generate exit QR code (Data URL).');
              }

              // Log QR code generation success
              console.log('QR codes generated successfully for product ID:', productId);

              // Redirect to settings page with QR codes as query parameters
              res.redirect(`/settings?productId=${productId}&productName=${encodeURIComponent(productName)}&entryQR=${encodeURIComponent(entryQR)}&exitQR=${encodeURIComponent(exitQR)}`);
            });
          });
        });
      });
    });
  });
});

// Route to download entry QR code
app.get('/download-entry-qr/:productId', (req, res) => {
  const productId = req.params.productId;
  downloadQRCode(res, productId, 'entry');
});

// Route to download exit QR code
app.get('/download-exit-qr/:productId', (req, res) => {
  const productId = req.params.productId;
  downloadQRCode(res, productId, 'exit');
});

// Route to handle stock entry page
app.get('/stock-entry/:productId', (req, res) => {
  const productId = req.params.productId;
  handleStockTransaction(res, productId, 'entry');
});

// Route to handle stock exit page
app.get('/stock-exit/:productId', (req, res) => {
  const productId = req.params.productId;
  handleStockTransaction(res, productId, 'exit');
});

// POST route to handle stock update (entry/exit)
app.post('/update-stock', (req, res) => {
  const { productId, transactionType, quantity, site } = req.body;

  // Ensure that the quantity is a positive integer
  if (!productId || !quantity || quantity <= 0 || (transactionType === 'exit' && !site)) {
    console.error('Validation Error: Missing required fields or invalid quantity.');
    return res.status(400).send('All fields are required and quantity must be a positive number.');
  }

  // Convert quantity to an integer
  const quantityInt = parseInt(quantity, 10);

  // Determine the SQL query for stock update based on transaction type
  const stockUpdateQuery = transactionType === 'entry'
    ? `UPDATE Stock SET stock_level = stock_level + ? WHERE product_id = ?`
    : `UPDATE Stock SET stock_level = stock_level - ? WHERE product_id = ?`;

  // Update the stock level
  db.query(stockUpdateQuery, [quantityInt, productId], (err, result) => {
    if (err) {
      console.error(`Error updating stock for ${transactionType}:`, err.message, err.stack);
      return res.status(500).send('Failed to update stock.');
    }

    // Log the transaction in the Transactions table
    const transactionQuery = transactionType === 'exit'
      ? `INSERT INTO Transactions (product_id, transaction_type, quantity, chantier_nom) VALUES (?, 'exit', ?, ?)`
      : `INSERT INTO Transactions (product_id, transaction_type, quantity) VALUES (?, 'entry', ?)`;

    const transactionParams = transactionType === 'exit'
      ? [productId, quantityInt, site]
      : [productId, quantityInt];

    db.query(transactionQuery, transactionParams, (err) => {
      if (err) {
        console.error('Error inserting transaction data:', err.message, err.stack);
        return res.status(500).send('Failed to insert transaction data.');
      }

      console.log(`Transaction data inserted successfully for product ID: ${productId}, type: ${transactionType}, quantity: ${quantityInt}`);
      res.send(`
        <html>
          <head>
            <title>Stock ${transactionType === 'entry' ? 'Entry' : 'Exit'} Success</title>
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
          </head>
          <body>
            <div class="container mt-5">
              <div class="alert alert-success text-center">
                Stock ${transactionType === 'entry' ? 'entry' : 'exit'} successful! Quantity: ${quantityInt}.
              </div>
              <div class="text-center">
                <a href="/" class="btn btn-primary">Return to Home</a>
              </div>
            </div>
          </body>
        </html>
      `);
    });
  });
});

// Start the server on port 3000
const PORT = 3000;
const qrCodeDir = path.join(__dirname, 'qrcodes');

// Ensure the directory for storing QR codes exists when the server starts
if (!fs.existsSync(qrCodeDir)) {
  fs.mkdirSync(qrCodeDir);
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});