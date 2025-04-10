Installation

Clone this repository:
git clone https://github.com/ada682/teh.git
cd tea-bot

Install dependencies:
npm install

Create a .env file from the example:
cp .env.example .env

Add your private key to the .env file:
PRIVATE_KEY=your_private_key_here
⚠️ WARNING: Never share your private key or commit the .env file to Git!

Usage
Start the bot:
npm start
The bot will guide you through setup:

Choose whether to run in infinite mode or single transaction mode
Set the amount of TEA to send per transaction (default: 0.5)
