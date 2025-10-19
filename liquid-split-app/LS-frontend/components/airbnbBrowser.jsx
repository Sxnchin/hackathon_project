import React, { useState } from "react";

const API_KEY = process.env.REACT_APP_RAPIDAPI_KEY;

function AirbnbBrowser() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);

    try {
      // Example Airbnb API on RapidAPI: "Airbnb13 API"
      // Endpoint: https://airbnb13.p.rapidapi.com/search-location
      const res = await fetch(
        `https://airbnb13.p.rapidapi.com/search-location?location=${encodeURIComponent(
          query
        )}&checkin=2025-12-01&checkout=2025-12-05&adults=1`,
        {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": API_KEY,
            "X-RapidAPI-Host": "airbnb13.p.rapidapi.com",
          },
        }
      );

      const data = await res.json();

      if (data.results) {
        const mapped = data.results.slice(0, 8).map((item) => ({
          id: item.id,
          name: item.name,
          location: item.address,
          price: item.price.total || 0,
          image: item.images?.[0],
          retailer: "Airbnb",
        }));
        setResults(mapped);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Error fetching Airbnb data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="airbnb-browser p-4">
      <div className="flex space-x-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Airbnb listings (e.g. Miami, Paris, Cabin)"
          className="border p-2 flex-1 rounded"
        />
        <button
          onClick={handleSearch}
          className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.map((listing) => (
            <div
              key={listing.id}
              className="border rounded-lg overflow-hidden shadow hover:shadow-lg transition"
            >
              <img
                src={listing.image}
                alt={listing.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-3 flex flex-col justify-between">
                <h4 className="font-semibold text-gray-800 text-sm">
                  {listing.name}
                </h4>
                <p className="text-gray-500 text-xs">{listing.location}</p>
                <p className="font-bold text-gray-800 mt-2">
                  ${listing.price.toFixed(2)} total
                </p>
                <button
                  onClick={() => onAddToCart(listing)}
                  className="bg-green-500 text-white px-3 py-1 mt-2 rounded hover:bg-green-600"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AirbnbBrowser;
