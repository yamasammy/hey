```markdown
# LionelV2

LionelV2 is an inventory management system designed to streamline stock entry and exit through the use of QR codes. Users can generate color-coded QR codes (green for stock entry, red for stock exit) for each product. Scanning these QR codes directs users to a product-specific web page where they can input the quantity of stock to be entered or exited. The system also includes a settings page for managing products and generating QR codes.

## Overview

LionelV2 is built using a modern web stack, combining a Node.js backend with Express for routing and MySQL for data storage. The frontend uses EJS for templating and Bootstrap for responsive design. QR code generation is handled by the `qrcode` library, and the system supports real-time stock updates through product-specific web pages.

### Technologies used:
- **Node.js**: JavaScript runtime for building the backend.
- **Express.js**: Web framework for handling routing and requests.
- **MySQL**: Relational database for storing product, stock, and transaction data.
- **EJS**: Templating engine for rendering dynamic HTML pages.
- **QRCode**: Library for generating QR codes.
- **Bootstrap**: CSS framework for responsive user interfaces.

### Project structure:
```
/config
  db.js           # Database connection setup
/public
  /qrcodes        # Directory to store generated QR code images
/views
  index.ejs       # Main page template
  settings.ejs    # Settings page for managing products
  product.ejs     # Product-specific page for stock entry/exit
app.js            # Main application file (Express server setup, routing)
package.json      # Project metadata and dependencies
```

## Features

- **QR Code Generation**: For each product, the system generates two QR codes: one for stock entry (green) and one for stock exit (red).
- **Stock Management**: Scanning a QR code directs the user to a product-specific page where they can view current stock levels and submit stock updates (entry or exit).
- **Product Management**: The settings page allows users to add new products, generate QR codes, and manage existing products (update or delete).
- **Real-Time Stock Updates**: The system updates stock levels in real-time and maintains a transaction log in the MySQL database.
- **Responsive Design**: The user interface is built with Bootstrap, ensuring compatibility across devices.

## Getting started

### Requirements

To run LionelV2, ensure you have the following installed on your machine:
- **Node.js** (v14.x or later)
- **MySQL** (v8.x or later)
- **npm** (Node Package Manager)

### Quickstart

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/lionelv2.git
   cd lionelv2
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure MySQL**:
   - Create a MySQL database for the project.
   - Update the database configuration in `config/db.js` with your MySQL credentials.

4. **Run database migrations** (if applicable):
   - Create the necessary tables (Products, Stock, Transactions) in your MySQL database.
   - Example SQL:
     ```sql
     CREATE TABLE Products (
       id INT AUTO_INCREMENT PRIMARY KEY,
       name VARCHAR(255) NOT NULL,
       packaging_type VARCHAR(255)
     );

     CREATE TABLE Stock (
       product_id INT,
       stock_level INT,
       FOREIGN KEY (product_id) REFERENCES Products(id)
     );

     CREATE TABLE Transactions (
       id INT AUTO_INCREMENT PRIMARY KEY,
       product_id INT,
       transaction_type ENUM('entry', 'exit'),
       quantity INT,
       timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (product_id) REFERENCES Products(id)
     );
     ```

5. **Start the server**:
   ```bash
   npm start
   ```

6. **Access the app**:
   - Open your browser and go to `http://localhost:3000` to access the app.
   - Navigate to `/settings` to add new products and generate QR codes.

### License

Copyright (c) 2024.
```