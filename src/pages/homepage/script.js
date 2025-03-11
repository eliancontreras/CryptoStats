const favoriteCoinsContainer = document.querySelector(".other-coins")
const mainCoinContainer = document.querySelector(".main-goes-here")
const favoriteCoinsForm = document.querySelector("#fav-search")
const favoriteCoinsSearchBar = document.querySelector("#fav-search input")
const currencySelect = document.querySelector("#currency-selector")


//Event Listeners
favoriteCoinsForm.addEventListener("submit", (e)=>{
  e.preventDefault()
  searchForFavoriteCoin(favoriteCoinsSearchBar.value)
})

currencySelect.addEventListener("change", async (e)=>{
  await chrome.storage.local.set({currentCurrency : currencySelect.value})

  getFavoriteCoinsFromStorageAndDisplayThem()
})
//

init()

function searchForFavoriteCoin(searchParameter){
  const filteredCoins = allCoins.filter((coin)=> coin.name.toLowerCase().includes(searchParameter.toLowerCase()))

  if(filteredCoins.length == 0){
    return isEmptyFavoriteSearch()
  }

  favoriteCoinsContainer.innerHTML = renderFavoriteCoins(filteredCoins)
}

let allCoins = []

async function getFavoriteCoinsFromStorageAndDisplayThem(){
    try{
        const coinsInStorage = await chrome.storage.local.get(["favoriteCoins"])

        const coinsInStorageArray = coinsInStorage.favoriteCoins || []

        const currencyInStorage = await chrome.storage.local.get(["currentCurrency"])

        const currentCurrencyValue = currencyInStorage.currentCurrency || "usd"

        if(coinsInStorageArray.length == 0){
            return isEmptyFavorite()
        }else{
          mainCoinContainer.innerHTML = ""

          isLoading()

            const rawFetch = await fetch(`https://cryptostats-backend.onrender.com/api/displayFavorite?coinNames=${coinsInStorageArray}&currency=${currentCurrencyValue}`)

            const coinsInfo = await rawFetch.json()

        if(!rawFetch.ok){
            throw new Error("searching error")
        }

        allCoins = coinsInfo

        const [mainCoin] = coinsInfo.splice(0, 1)

        mainCoinContainer.innerHTML = renderMainCoin(mainCoin, currentCurrencyValue)

        draw(mainCoin.sparkline_in_7d.price, mainCoin.sparkline_in_7d.price.length, mainCoin.price_change_percentage_24h)

        favoriteCoinsContainer.innerHTML = renderFavoriteCoins(coinsInfo, currentCurrencyValue)

        }
    }
    catch (err){
      return isError()
    }
}

function isLoading(){
    const a = `<div class="big-loader">
        
    </div>
    
    <div class="loader">
        
    </div>

    <div class="loader">
        
    </div>

    <div class="loader">
        
    </div>
    `
        favoriteCoinsContainer.innerHTML = a
}

function isEmptyFavorite(){
    const a = `<p class="empty">
        Oops, seems like you haven't added any coin to your favorite page
    </p>
    `
    favoriteCoinsContainer.innerHTML = a
}

function isEmptyFavoriteSearch(){
  const a = `<p class="empty">
      Oops, seems like we couldn't find the coin you were looking for. Try Searching for it in the <a href="../searchpage/search.html"> Search page </a>
  </p>
  `
  favoriteCoinsContainer.innerHTML = a
}

function isError(errorMessage="Seems like an error occurred, please try reloading the extension", type="strong"){
  const a = `<p class=${type == "strong" ? "error" : "empty"}>${errorMessage}</p>`
  favoriteCoinsContainer.innerHTML = a
}

function renderFavoriteCoins(coinsInfo, currency){
    let a = ""

    const currencySymbol = getCurrencySymbol(currency)

    coinsInfo.forEach((coinInfo)=>{
            const status = coinInfo.price_change_percentage_24h > 0 ? "good" : "bad"

            const statusSymbol = status == "good"? "+" : ""

            const priceChange = coinInfo.price_change_percentage_24h? coinInfo.price_change_percentage_24h.toFixed(2) : false

            let price = Math.round(coinInfo.current_price) >= 1
          ? coinInfo.current_price.toFixed(2)
          : coinInfo.current_price.toFixed(5)

      if(price > 999){
          price = new Intl.NumberFormat().format(price)
      }else if(price == 0){
        price = "<0.000001"
    }

            a += `
        <div class="single-coin-container">
            <div class="logo-and-name">
                <div class="logo-container">
                <img src=${coinInfo.image} alt="${coinInfo.name} logo">
                </div>

                <div class="name">
                    <h1>${coinInfo.name}</h1>
                    <p>${coinInfo.symbol.toUpperCase()}</p>
                </div>
            </div>

            <div class="price-info">
                <h1>${currencySymbol}${price}</h1>
                <p class=${status}>${statusSymbol}${priceChange || 0}%</p>
            </div>
        </div>
        `
    })

    return a
}

function renderMainCoin(mainCoinInfo, currency){
            const currencySymbol = getCurrencySymbol(currency)
            let a = ""

            const status = mainCoinInfo.price_change_percentage_24h > 0 ? "good" : "bad"

            const statusSymbol = status == "good"? "+" : ""

            const priceChange = mainCoinInfo.price_change_percentage_24h? mainCoinInfo.price_change_percentage_24h.toFixed(2) : false

            const price = new Intl.NumberFormat().format(
              Math.round(mainCoinInfo.current_price) >= 1
                ? mainCoinInfo.current_price?.toFixed(3)
                : mainCoinInfo.current_price?.toFixed(5)
            )

            a = `<div class="main-coin-container">
        <div class="top-section">
            <div class="top-logo-and-info">

                <div class="logo-container">
                <img src=${mainCoinInfo.image} alt="${mainCoinInfo.name} logo">
                </div>

                <div class="top-name-and-info">

                     <h1>${mainCoinInfo.name}</h1>
                    <p>${mainCoinInfo.symbol.toUpperCase()}</p>

                </div>
                
            </div>

            <div class="top-price-and-increase">
                <h1>${currencySymbol}${price}</h1>
                <p class=${status}>${statusSymbol}${priceChange || 0}%</p>
            </div>
        </div>

        <div class="canvas-container">
        <canvas id="myChart" class="graph"></canvas>
        </div>

    </div>
            `
            return a
}

function getPreviousSevenDays(numPoints) {
  const timestamps = [];
  const now = new Date();

  for (let i = 0; i < numPoints; i++) {
      const pastDate = new Date(now.getTime() - (i * 60 * 60 * 1000));  // Subtract hours for each price point
      timestamps.push(pastDate.toLocaleString());  // Format the timestamp as a readable string
  }

  return timestamps.reverse();
}

function draw(dataArray, numPoints, priceChange){
  const status = priceChange > 0 ? "good" : "bad";

  const ctx = document.getElementById("myChart");

  const cc = ctx.getContext("2d");

  const gradient = cc.createLinearGradient(0, 0, 0, 100);

  status == "good"
    ? gradient.addColorStop(0, "#2B682333")
    : gradient.addColorStop(0, "#68232333");

  gradient.addColorStop(1, "#262626");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: getPreviousSevenDays(numPoints),
      datasets: [
        {
          label: "",
          tension: 0,
          borderWidth: 2,
          data: [...dataArray],
          borderColor: status == "good" ? "#268244" : "#C43D3D", // Line color
          backgroundColor: gradient, // Area under the line
          fill: true,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false, // Completely remove the legend
        },
      },
      scales: {
        y: {
          grid: {
            display: false, // Hide grid lines for x-axis
          },
          beginAtZero: false,
          min: Math.min(...dataArray), // Start value on the Y-axis
          max: Math.max(...dataArray), // End value on the Y-axis
          ticks: {
            display: false,
            stepSize: 20, // Optional: Set the spacing between ticks
          },
        },
        x: {
          grid: {
            display: false, // Hide grid lines for x-axis
          },
          ticks: {
            display: false,
          },
        },
      },
    },
  });
  
}

function getCurrencySymbol(shortFormOfCurrency){
  if(shortFormOfCurrency == "usd"){
    return "$"
  }else if(shortFormOfCurrency == "ngn"){
    return "N"
  }else if(shortFormOfCurrency == "ngn"){
    return "N"
  }else if(shortFormOfCurrency == "eur"){
    return "€"
  }else if(shortFormOfCurrency == "aud"){
    return "AU$"
  }else if(shortFormOfCurrency == "php"){
    return "₱"
  }else if(shortFormOfCurrency == "aed"){
    return "د.إ"
  }else if(shortFormOfCurrency == "nzd"){
    return "NZ$"
  }else if(shortFormOfCurrency == "btc"){
    return "₿"
  }
}

async function updateSelectContainer(){
  const currencyInStorage = await chrome.storage.local.get(["currentCurrency"])

    const currentCurrencyValue = currencyInStorage.currentCurrency || "usd"

    const allOptions = currencySelect.options

    for(option of allOptions){
      if(option.value == currentCurrencyValue){
        option.selected = true
      }
    }
}

function init(){
  updateSelectContainer()
  getFavoriteCoinsFromStorageAndDisplayThem()
}
