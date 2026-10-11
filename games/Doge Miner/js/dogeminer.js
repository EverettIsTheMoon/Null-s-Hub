var preLoad = {
  minebutton: null,
  balance: null,
  header: null,
  workers: null,
  items: ["dogeminer", "dogeescavator", "dogefactory", "dogescientist"],
  upgrades: ["upgrade1", "upgrade2", "upgrade3", "upgrade4", "upgrade5"],
  itemprices: [30, 200, 1000, 10000],
  itemquantity: [0, 0, 0, 0],
  upgradeprices: [2000, 5000, 10000, 20000, 50000],
  multipliers: [1, 1, 1, 1, 1],
  pricechange: [4, 50, 200, 5000],
  dogecoin: 0,
  dogepersecond: 0,
  totalspent: 0,
  newsarr: [
    "Dogecoin hits $1. Investors are cheering!",
    "Local florida 14 year old became a doge millionaire.",
    "Elon Musk to send dogecoin to Mars.",
    "Rumors say that dogecoin was created by Elon Musk.",
    "Largest dogecoin mine in china raided last week, news say.",
    "Is dogecoin worth your time? Absolutely!",
    "Dogecoin confirmed as an official currency of the US.",
    "School teacher finds old dogecoin wallet with $100,000, sources say.",
    "Binance buys over 500 million worth of dogecoin. Price surges.",
    "Dogecoin price falls to $0.11. Time to purchase more?",
    "Amazon now accepts Dogecoin as one of its official payment options.",
    "Dogecoin hits 1 billion market cap.",
  ],

  begin: function () {
    // GET ELEMENTS
    preLoad.minebutton = document.getElementById("minebutton");
    preLoad.balance = document.getElementById("balance");
    preLoad.header = document.getElementById("header");
    preLoad.workers = document.getElementById("workers");

    // ADD EVENT LISTENER TO MINE BUTTON
    preLoad.minebutton.addEventListener("click", mine);

    getItems();
  },
};

function getItems() {
  // GET MARKETPLACE ITEMS AND ADD EVENT LISTENERS
  for (let i = 0; i < preLoad.items.length; i++) {
    item = document.getElementById(preLoad.items[i]);
    item.addEventListener("click", handleBuy);
  }
  // GET UPGRADE ITEMS AND ADD EVENT LISTENERS
  for (let i = 0; i < preLoad.upgrades.length; i++) {
    item = document.getElementById(preLoad.upgrades[i]);
    item.addEventListener("click", handleBuy);
  }
}
function mine() {
  // HANDLE USER DOGE MINING
  preLoad.dogecoin += preLoad.multipliers[0];
  handleDisplay();
  dogefall = document.getElementById("mine-div");

  // DISPLAY FALLING DOGE COINS
  const dogefallimg = document.createElement("img");
  dogefallimg.setAttribute("src", "./img/dogecoin.png");
  dogefallimg.classList.add("dogecoinfall");
  dogefall.appendChild(dogefallimg);

  setTimeout(function () {
    dogefallimg.remove();
  }, 6000);
}

function printNews() {
  // DISPLAY RANDOM NEWS ARTICLE FROM ARRAY
  setTimeout(function () {
    preLoad.header.innerHTML = "";
    let num = Math.floor(Math.random() * preLoad.newsarr.length);
    let text = preLoad.newsarr[num];

    let newsText = document.createElement("div");
    newsText.setAttribute("class", "text");
    newsText.innerText = text;

    preLoad.header.appendChild(newsText);
    printNews();
  }, 5000);
}

function handleBuy() {
  // GET  WORKER AND UPGRADE ARRAYS
  const workerName = preLoad.items;
  const upgradeType = preLoad.upgrades;

  // GET UPGRADE ELEMENTS
  const upgradeImg = document.getElementById(this.id);
  const upgradePrice = document.getElementById(`${this.id}price`);

  // HANDLES MARKETPLACE PURCHASES
  if (preLoad.dogecoin >= preLoad.itemprices[workerName.indexOf(this.id)]) {
    preLoad.itemquantity[workerName.indexOf(this.id)] += 1;
    preLoad.dogecoin =
      preLoad.dogecoin - preLoad.itemprices[workerName.indexOf(this.id)];
    preLoad.totalspent += preLoad.itemprices[workerName.indexOf(this.id)];
    preLoad.itemprices[workerName.indexOf(this.id)] +=
      preLoad.itemquantity[workerName.indexOf(this.id)] *
      preLoad.pricechange[workerName.indexOf(this.id)];

    const worker = document.createElement("img");
    worker.setAttribute("src", `./img/${this.id}.png`);
    worker.style.width = "60px";
    worker.style.height = "auto";
    worker.style.padding = "0";
    worker.classList.add(workerName[workerName.indexOf(this.id)]);
    preLoad.workers.appendChild(worker);
    handleDisplay();
  } else {
  }

  // HANDLES UPGRADE PURCHASES
  if (preLoad.dogecoin >= preLoad.upgradeprices[upgradeType.indexOf(this.id)]) {
    preLoad.dogecoin =
      preLoad.dogecoin - preLoad.upgradeprices[upgradeType.indexOf(this.id)];
    preLoad.totalspent += preLoad.upgradeprices[upgradeType.indexOf(this.id)];

    preLoad.multipliers[upgradeType.indexOf(this.id)] = 2;
    upgradeImg.style.display = "none";
    upgradePrice.style.display = "none";
    handleDisplay();
  }
}
function doMining() {
  // HANDLE WORKER MINING
  setTimeout(function () {
    preLoad.dogepersecond =
      1 * preLoad.itemquantity[0] * preLoad.multipliers[1] +
      2.5 * preLoad.itemquantity[1] * preLoad.multipliers[2] +
      7.5 * preLoad.itemquantity[2] * preLoad.multipliers[3] +
      15 * preLoad.itemquantity[3] * preLoad.multipliers[4];
    preLoad.dogecoin += preLoad.dogepersecond;
    handleDisplay();
    doMining();
  }, 1000);
}

function handleDisplay() {
  //GET STATISTICS TAB
  dogepersecond = document.getElementById("dogepersecond");
  totalspent = document.getElementById("totalspent");

  // UPDATE STATISTICS TAB
  preLoad.balance.innerHTML = preLoad.dogecoin;
  dogepersecond.innerHTML = `Doge per second: ${preLoad.dogepersecond}`;
  totalspent.innerHTML = `Total doge spent: ${preLoad.totalspent}`;

  // UPDATE MARKETPLACE TAB
  preLoad.items.forEach((name) => {
    namequantity = document.getElementById(`${name}quantity`);
    nameprice = document.getElementById(`${name}price`);

    if (preLoad.dogecoin >= preLoad.itemprices[preLoad.items.indexOf(name)]) {
      document.getElementById(name).style.opacity = "1";
    } else {
      document.getElementById(name).style.opacity = "0.5";
    }

    namequantity.innerHTML = preLoad.itemquantity[preLoad.items.indexOf(name)];
    nameprice.innerHTML = `${
      preLoad.itemprices[preLoad.items.indexOf(name)]
    } doge`;
  });

  // UPDATE UPGRADES TAB
  preLoad.upgrades.forEach((name) => {
    if (
      preLoad.dogecoin >= preLoad.upgradeprices[preLoad.upgrades.indexOf(name)]
    ) {
      document.getElementById(name).style.opacity = "1";
    } else {
      document.getElementById(name).style.opacity = "0.5";
    }
  });
}

window.addEventListener("load", preLoad.begin);
window.addEventListener("load", handleDisplay);

printNews();

doMining();
