import Decimal from 'decimal.js';

export const priceChangeEmailTemplate = (
    name: string,
    price: number,
    current_price: number,
    url: string,
) =>
    `
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Price Change Alert</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                color: #333;
            }
            .price {
                color: #d9534f;
                font-weight: bold;
            }
            .button {
                display: inline-block;
                padding: 10px 20px;
                margin-top: 20px;
                color: #fff;
                background-color: #5cb85c;
                text-decoration: none;
                border-radius: 5px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2 class="header">Price Change Alert!</h2>
            <p>The price of <strong>${name}</strong> has changed.</p>
            <p>Old Price: <span class="price">$${current_price}</span></p>
            <p>New Price: <span class="price">$${price}</span></p>
            <p>That's a difference of <strong>$${Decimal.sub(
                current_price,
                price,
            )}</strong>!</p>
            <a href="${url}" class="button">View Product</a>
        </div>
    </body>
    </html>
`;

export const productAddedEmailTemplate = (
    url: string,
    name: string,
    price: number,
) =>
    `
    <html>
    <head>
        <meta charset="UTF-8">
        <title>New Product Tracked</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                text-align: center;
            }
            .header {
                color: #333;
            }
            .message {
                font-size: 16px;
                color: #555;
            }
            .button {
                display: inline-block;
                padding: 10px 20px;
                margin-top: 20px;
                color: #fff;
                background-color: #007bff;
                text-decoration: none;
                border-radius: 5px;
            }
            .product-info {
                margin-top: 15px;
                font-size: 16px;
                color: #444;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2 class="header">New Product Added for Tracking</h2>
            <p class="message">A new product has been successfully added to your tracking list.</p>
            <p class="product-info"><strong>Product Name:</strong> ${name}</p>
            <p class="product-info"><strong>Current Price:</strong> $${price}</p>
            <p class="message">You will receive alerts when its price changes.</p>
            <a href="${url}" class="button">View Product</a>
        </div>
    </body>
    </html>
`;
