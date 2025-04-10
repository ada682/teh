import { ethers } from 'ethers';
import readline from 'readline';
import axios from 'axios';
import { config } from 'dotenv';
import chalk from 'chalk';
import figlet from 'figlet';
import ora from 'ora';
import { createSpinner } from 'nanospinner';
import gradient from 'gradient-string';
import boxen from 'boxen';

config();

const networkConfig = {
  name: 'Tea Sepolia',
  chainId: 10218,
  url: 'https://tea-sepolia.g.alchemy.com/public',
  explorerUrl: 'https://sepolia.tea.xyz'
};

const ADDRESS_LIST_URL = 'https://raw.githubusercontent.com/clwkevin/LayerOS/refs/heads/main/addressteasepoliakyc.txt';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(chalk.cyan(query), resolve));
}

async function animateSnake(text) {
  const width = 60;
  const height = 15;
  const positions = [];
  
  for (let i = 0; i < width; i++) positions.push({x: i, y: 0});
  for (let i = 1; i < height; i++) positions.push({x: width-1, y: i});
  for (let i = width-2; i >= 0; i--) positions.push({x: i, y: height-1});
  for (let i = height-2; i > 0; i--) positions.push({x: 0, y: i});
  
  const snakeChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const snakeColors = [
    chalk.green,
    chalk.greenBright,
    chalk.yellow,
    chalk.blue,
    chalk.magenta
  ];
  
  const snakeLength = 10;
  let frameCount = 0;
  
  const logoLines = text.split('\n');
  const logoHeight = logoLines.length;
  const logoWidth = Math.max(...logoLines.map(line => line.length));
  
  const logoX = Math.floor((width - logoWidth) / 2);
  const logoY = Math.floor((height - logoHeight) / 2);
  
  console.clear();
  
  return new Promise(resolve => {
    const intervalId = setInterval(() => {
      console.clear();
      
      const canvas = Array(height).fill().map(() => Array(width).fill(' '));
      
      logoLines.forEach((line, i) => {
        if (logoY + i < height) {
          for (let j = 0; j < line.length; j++) {
            if (logoX + j < width) {
              canvas[logoY + i][logoX + j] = line[j];
            }
          }
        }
      });
      
      for (let i = 0; i < snakeLength; i++) {
        const pos = positions[(frameCount - i) % positions.length];
        if (pos) {
          const snakeChar = snakeChars[i % snakeChars.length];
          const colorFn = snakeColors[i % snakeColors.length];
          if (canvas[pos.y] && canvas[pos.y][pos.x] === ' ') {
            canvas[pos.y][pos.x] = colorFn(snakeChar);
          }
        }
      }
      
      console.log(canvas.map(row => row.join('')).join('\n'));
      
      frameCount++;
      
      if (frameCount > positions.length * 3) {
        clearInterval(intervalId);
        console.clear();
        resolve();
      }
    }, 50);
  });
}

async function printLogo() {
  console.clear();
  
  const teaBotText = figlet.textSync('TEA BOT', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  });
  
  await animateSnake(teaBotText);
  
  console.log(
    gradient.pastel.multiline(teaBotText)
  );
  
  console.log(
    boxen(chalk.blue(`🤖 TEA SEPOLIA AUTO TRANSFER BOT v1.0`), {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'green'
    })
  );
  
  console.log(chalk.yellow('='.repeat(70)) + '\n');

  const spinner = createSpinner('Initializing TEA BOT...').start();
  await new Promise(resolve => setTimeout(resolve, 1500));
  spinner.success({ text: 'TEA BOT Ready!' });
}

async function fetchAddresses() {
  const spinner = ora('Fetching addresses from GitHub...').start();
  try {
    const response = await axios.get(ADDRESS_LIST_URL);
    if (response.status === 200) {
      const addresses = response.data
        .split('\n')
        .map(address => address.trim())
        .filter(address => address && ethers.isAddress(address));
      
      spinner.succeed(chalk.green(`Successfully loaded ${chalk.bold(addresses.length)} valid addresses`));
      return addresses;
    } else {
      spinner.fail(`Failed to fetch addresses: HTTP status ${response.status}`);
      return [];
    }
  } catch (error) {
    spinner.fail(`Error fetching addresses: ${error.message}`);
    return [];
  }
}

function getRandomAddress(addresses) {
  const randomIndex = Math.floor(Math.random() * addresses.length);
  return addresses[randomIndex];
}

async function transferTEA(wallet, provider, toAddress, amountTEA) {
  try {
    const amountWei = ethers.parseEther(amountTEA.toString());
    
    console.log(chalk.yellow('\n⚡️ INITIATING TRANSACTION ⚡️'));
    console.log(chalk.cyan(`🎯 Target: ${chalk.bold(toAddress.substring(0, 6) + '...' + toAddress.substring(38))}`));
    console.log(chalk.magenta(`💰 Amount: ${chalk.bold(amountTEA)} TEA`));
    
    const spinner = ora('Sending transaction...').start();
    
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountWei
    });
    
    spinner.text = 'Waiting for confirmation...';
    
    const receipt = await tx.wait();
    
    spinner.succeed(chalk.green('Transaction confirmed!'));
    
    console.log(chalk.green(`✅ ${chalk.bold('SUCCESS:')} Block #${receipt.blockNumber}`));
    console.log(chalk.blue(`🔍 Explorer: ${networkConfig.explorerUrl}/tx/${tx.hash}`));
    console.log(chalk.gray(`⛽ Gas used: ${receipt.gasUsed.toString()}`));
    
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Transfer failed: ${error.message}`));
    return false;
  }
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function showProgressBar(current, total) {
  const percentage = Math.round((current / total) * 100);
  const completed = Math.round((percentage / 100) * 40);
  const remaining = 40 - completed;
  const bar = '█'.repeat(completed) + '░'.repeat(remaining);
  return `${bar} ${percentage}%`;
}

async function main() {
  await printLogo();
  
  if (!process.env.PRIVATE_KEY) {
    console.error(chalk.red('⛔ Error: Please set your PRIVATE_KEY in .env file'));
    rl.close();
    return;
  }
  
  const runForever = await askQuestion('🔄 Run forever? (y/n): ');
  const amountInput = await askQuestion('💎 Amount of TEA to send (recommended 0.5): ');
  const amountTEA = parseFloat(amountInput) || 0.5;
  
  console.log(chalk.yellow('\n🚀 INITIALIZING BOT 🚀'));
  console.log(chalk.cyan(`📊 Network: ${chalk.bold(networkConfig.name)} (Chain ID: ${networkConfig.chainId})`));
  console.log(chalk.cyan(`💵 Amount per TX: ${chalk.bold(amountTEA)} TEA`));
  console.log(chalk.cyan(`🔁 Mode: ${chalk.bold(runForever.toLowerCase() === 'y' ? 'Infinite' : 'Single')}`));
  
  const provider = new ethers.JsonRpcProvider(networkConfig.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log(chalk.cyan(`👛 Wallet: ${chalk.bold(wallet.address.substring(0, 6) + '...' + wallet.address.substring(38))}`));
  
  const addresses = await fetchAddresses();
  if (addresses.length === 0) {
    console.error(chalk.red('⛔ No valid addresses found. Exiting...'));
    rl.close();
    return;
  }
  
  let isRunning = true;
  let txCount = 0;
  
  while (isRunning) {
    try {
      const spinner = ora('Checking wallet balance...').start();
      const balance = await provider.getBalance(wallet.address);
      const balanceTEA = parseFloat(ethers.formatEther(balance));
      spinner.succeed(chalk.green(`Current balance: ${chalk.bold(balanceTEA.toFixed(4))} TEA`));
      
      if (balanceTEA >= amountTEA) {
        const randomAddress = getRandomAddress(addresses);
        txCount++;
        console.log(chalk.yellow(`\n📝 TX #${txCount} INITIATED`));
        await transferTEA(wallet, provider, randomAddress, amountTEA);
        
        if (runForever.toLowerCase() !== 'y') {
          isRunning = false;
          console.log(chalk.green('\n✅ Mission accomplished!'));
        } else {
          const delaySeconds = getRandomDelay(5, 15);
          const nextRun = new Date(Date.now() + delaySeconds * 1000);
          
          console.log(chalk.yellow(`\n⏳ Cooldown period: ${chalk.bold(delaySeconds)} seconds`));
          console.log(chalk.blue(`⏱️ Next TX at: ${chalk.bold(nextRun.toLocaleTimeString())}`));
          
          let elapsed = 0;
          const updateInterval = 1000;
          const spinner = ora('Waiting for next transaction...').start();
          
          while (elapsed < delaySeconds * 1000) {
            await new Promise(resolve => setTimeout(resolve, updateInterval));
            elapsed += updateInterval;
            const progress = showProgressBar(elapsed, delaySeconds * 1000);
            spinner.text = `Cooldown: ${progress} (${Math.round(elapsed/1000)}/${delaySeconds}s)`;
          }
          
          spinner.succeed(chalk.green('Cooldown complete!'));
        }
      } else {
        console.log(chalk.yellow(`\n⚠️ Insufficient balance (${balanceTEA.toFixed(4)} TEA) to send ${amountTEA} TEA`));
        console.log(chalk.blue('🕒 Waiting for 60 seconds before checking balance again...'));
        
        const spinner = ora('Waiting for funds...').start();
        let elapsed = 0;
        const waitTime = 60 * 1000;
        const updateInterval = 1000;
        
        while (elapsed < waitTime) {
          await new Promise(resolve => setTimeout(resolve, updateInterval));
          elapsed += updateInterval;
          const progress = showProgressBar(elapsed, waitTime);
          spinner.text = `Waiting for funds: ${progress} (${Math.round(elapsed/1000)}/60s)`;
        }
        
        spinner.succeed(chalk.green('Wait complete, checking balance again...'));
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ ERROR: ${error.message}`));
      console.log(chalk.yellow('🔄 Restarting in 30 seconds...'));
      await new Promise(resolve => setTimeout(resolve, 30 * 1000));
    }
  }
  
  console.log(chalk.green('\n👋 Thanks for using TEA BOT!'));
  rl.close();
}

main().catch(console.error);