import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

const FILM_REGISTRY_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "filmId", type: "uint256" },
      { indexed: false, internalType: "string", name: "filmName", type: "string" },
      { indexed: false, internalType: "uint8", name: "rating", type: "uint8" },
      { indexed: false, internalType: "string", name: "review", type: "string" },
    ],
    name: "FilmAdded",
    type: "event",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "films",
    outputs: [
      { internalType: "string", name: "filmName", type: "string" },
      { internalType: "uint8", name: "rating", type: "uint8" },
      { internalType: "string", name: "review", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_filmName", type: "string" },
      { internalType: "uint8", name: "_rating", type: "uint8" },
      { internalType: "string", name: "_review", type: "string" },
    ],
    name: "addFilm",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllFilms",
    outputs: [
      {
        components: [
          { internalType: "string", name: "filmName", type: "string" },
          { internalType: "uint8", name: "rating", type: "uint8" },
          { internalType: "string", name: "review", type: "string" },
        ],
        internalType: "struct FilmRegistry.Film[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getFilmCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const HARDHAT_NETWORK_ID = "31337";

// Star Rating Component
const StarRating = ({ rating, onRatingChange, readOnly = false }) => {
  const [hoveredRating, setHoveredRating] = useState(0);

  const ratingLabels = {
    1: "Not Good",
    2: "Could Be Better",
    3: "It's Okay",
    4: "Pretty Good",
    5: "Loved It!"
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onRatingChange(star)}
            onMouseEnter={() => !readOnly && setHoveredRating(star)}
            onMouseLeave={() => !readOnly && setHoveredRating(0)}
            className={`transition-all duration-200 ${
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
            }`}
            title={ratingLabels[star]}
          >
            <svg
              className={`w-6 h-6 ${
                star <= (hoveredRating || rating)
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-600 fill-gray-600"
              } transition-colors duration-200`}
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>
      {!readOnly && (hoveredRating > 0 || rating > 0) && (
        <p className="text-sm text-gray-400">
          {ratingLabels[hoveredRating || rating]}
        </p>
      )}
    </div>
  );
};

function App() {
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [contract, setContract] = useState(null);
  const [films, setFilms] = useState([]);
  const [filmName, setFilmName] = useState("");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isMetamaskInstalled, setIsMetamaskInstalled] = useState(false);
  const [expandedFilm, setExpandedFilm] = useState(null);
  const [hoveredFilm, setHoveredFilm] = useState(null);
  const [clickedFilm, setClickedFilm] = useState(null);

  useEffect(() => {
    setIsMetamaskInstalled(typeof window.ethereum !== "undefined");
  }, []);

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (message.type === "success" && message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setMessage({ type: "error", text: "Metamask not detected!" });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      let network = await provider.getNetwork();

      if (network.chainId.toString() !== HARDHAT_NETWORK_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x7a69" }],
          });
          const newProvider = new ethers.BrowserProvider(window.ethereum);
          const newSigner = await newProvider.getSigner();
          network = await newProvider.getNetwork();
          setAccount(accounts[0]);
          setNetwork(network);
          const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, FILM_REGISTRY_ABI, newSigner);
          setContract(contractInstance);
          setMessage({ type: "success", text: "Connected!" });
          await loadFilms(contractInstance);
        } catch (switchError) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: "0x7a69",
                  chainName: "Hardhat Local",
                  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                  rpcUrls: ["http://127.0.0.1:8545"],
                }],
              });
              await connectWallet();
            } catch (addError) {
              setMessage({ type: "error", text: "Failed to add network" });
            }
          } else {
            setMessage({ type: "error", text: "Please switch to Hardhat network" });
          }
        }
      } else {
        setAccount(accounts[0]);
        setNetwork(network);
        const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, FILM_REGISTRY_ABI, signer);
        setContract(contractInstance);
        setMessage({ type: "success", text: "Connected!" });
        await loadFilms(contractInstance);
      }
    } catch (error) {
      setMessage({ type: "error", text: `Connection failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
    setFilms([]);
    setNetwork(null);
    setMessage({ type: "success", text: "Disconnected" });
  };

  const loadFilms = async (contractInstance = contract) => {
    if (!contractInstance) return;
    try {
      setLoading(true);
      const allFilms = await contractInstance.getAllFilms();
      setFilms(allFilms.map((film, index) => ({
        id: index,
        filmName: film.filmName,
        rating: Number(film.rating),
        review: film.review,
      })));
    } catch (error) {
      setMessage({ type: "error", text: "Failed to load films" });
    } finally {
      setLoading(false);
    }
  };

  const addFilm = async (e) => {
    e.preventDefault();
    if (!contract) {
      setMessage({ type: "error", text: "Connect wallet first" });
      return;
    }
    if (!filmName.trim()) {
      setMessage({ type: "error", text: "Enter film name" });
      return;
    }
    if (rating === 0) {
      setMessage({ type: "error", text: "Select rating" });
      return;
    }

    try {
      setTxLoading(true);
      setMessage({ type: "info", text: "Confirm in Metamask..." });
      const tx = await contract.addFilm(filmName, rating, review);
      setMessage({ type: "info", text: "Processing..." });
      await tx.wait();
      setMessage({ type: "success", text: "Film added!" });
      setFilmName("");
      setRating(0);
      setReview("");
      await loadFilms();
    } catch (error) {
      setMessage({ type: "error", text: error.code === "ACTION_REJECTED" ? "Rejected" : "Failed" });
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          connectWallet();
        } else {
          setAccount(null);
          setContract(null);
          setFilms([]);
        }
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
        window.ethereum.removeAllListeners("chainChanged");
      }
    };
  }, []);

  const formatAddress = (addr) => addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : "";

  const avgRating = films.length > 0
    ? (films.reduce((sum, f) => sum + f.rating, 0) / films.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with Film Posters Collage */}
      <div className="fixed inset-0 z-0">
        <img 
          src="src/imagepng.png" 
          alt="Film Posters"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.style.background = '#1a1a1a';
          }}
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/75" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="backdrop-blur-md bg-black/60 border-b border-gray-700/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-red-600 to-red-700 p-2.5 rounded-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Cinema Chain</h1>
                  <p className="text-xs text-gray-400 font-medium">Blockchain Film Registry</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!account ? (
                  <button
                    onClick={connectWallet}
                    disabled={loading || !isMetamaskInstalled}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Connecting..." : "Connect Wallet"}
                  </button>
                ) : (
                  <>
                    <div className="bg-gray-800/80 border border-gray-700 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2 text-gray-300 font-mono text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        {formatAddress(account)}
                      </div>
                    </div>
                    <button
                      onClick={disconnectWallet}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8 pb-20">
          {/* Message */}
          {message.text && (
            <div className={`mb-6 rounded-lg p-4 border ${
              message.type === "success" ? "bg-green-900/40 border-green-700 text-green-200" :
              message.type === "error" ? "bg-red-900/40 border-red-700 text-red-200" :
              "bg-blue-900/40 border-blue-700 text-blue-200"
            }`}>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {/* Stats */}
          {account && films.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {[
                { label: "Total Films", value: films.length, icon: "M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" },
                { label: "Average Rating", value: `${avgRating}⭐`, icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
                { label: "5-Star Films", value: films.filter(f => f.rating === 5).length, icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" }
              ].map((stat, i) => (
                <div key={i} className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-5 hover:bg-gray-900/80 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium mb-1">{stat.label}</p>
                      <p className="text-white text-3xl font-bold">{stat.value}</p>
                    </div>
                    <div className="bg-red-600/20 p-3 rounded-lg">
                      <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Add Film Form */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900/70 border border-gray-700/50 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <div className="w-1 h-6 bg-red-600 rounded-sm"></div>
                  Add New Film
                </h2>

                <form onSubmit={addFilm} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Film Name</label>
                    <input
                      type="text"
                      value={filmName}
                      onChange={(e) => setFilmName(e.target.value)}
                      placeholder="e.g., The Matrix"
                      disabled={!account || txLoading}
                      className="w-full px-4 py-2.5 bg-gray-800/80 border border-gray-600 text-white rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all placeholder-gray-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Rating</label>
                    <StarRating rating={rating} onRatingChange={setRating} readOnly={!account || txLoading} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Review (Optional)</label>
                    <textarea
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      placeholder="Your thoughts..."
                      disabled={!account || txLoading}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-gray-800/80 border border-gray-600 text-white rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all placeholder-gray-500 resize-none disabled:opacity-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!account || txLoading || !filmName.trim() || rating === 0}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {txLoading ? "Adding..." : "Add to Collection"}
                  </button>
                </form>

                {!account && (
                  <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-400">Connect wallet to start tracking films</p>
                  </div>
                )}
              </div>
            </div>

            {/* Films Collection */}
            <div className="lg:col-span-3">
              <div className="bg-gray-900/70 border border-gray-700/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <div className="w-1 h-6 bg-red-600 rounded-sm"></div>
                    Your Collection
                  </h2>
                  <button
                    onClick={() => loadFilms()}
                    disabled={!contract || loading}
                    className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>

                {loading && films.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                  </div>
                ) : films.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="bg-gray-800/50 rounded-full p-6 mb-4">
                      <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 font-medium">No films yet</p>
                    <p className="text-gray-500 text-sm mt-1">Start adding to your collection</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {films.map((film, index) => (
                      <div 
                        key={film.id} 
                        className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/80 transition-colors"
                        onMouseEnter={() => film.review && setHoveredFilm(film.id)}
                        onMouseLeave={() => setHoveredFilm(null)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-lg mb-2 truncate">{film.filmName}</h3>
                            <div className="flex items-center gap-3 mb-2">
                              <StarRating rating={film.rating} readOnly={true} />
                              <span className="text-gray-400 text-sm">
                                {{
                                  1: "Not Good",
                                  2: "Could Be Better",
                                  3: "It's Okay",
                                  4: "Pretty Good",
                                  5: "Loved It!"
                                }[film.rating]}
                              </span>
                            </div>
                            {film.review && (
                              <div className="mt-3">
                                <button
                                  onClick={() => setClickedFilm(clickedFilm === film.id ? null : film.id)}
                                  className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors flex items-center gap-1"
                                >
                                  {(clickedFilm === film.id || hoveredFilm === film.id) ? "Hide" : "Show"} Review
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={(clickedFilm === film.id || hoveredFilm === film.id) ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                  </svg>
                                </button>
                                {(clickedFilm === film.id || hoveredFilm === film.id) && (
                                  <p className="mt-2 text-gray-300 text-sm leading-relaxed bg-gray-900/60 p-3 rounded-lg border border-gray-700">
                                    "{film.review}"
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 bg-black/60 border-t border-gray-700/50 py-3 z-20">
          <p className="text-center text-sm text-gray-500">
            🎬 Cinema Chain • Blockchain Film Review
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
