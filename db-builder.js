// ======================================
//  db-builder.js
//  GENERATORE DATABASE POI (Versione 1)
//  - Solo la città di Verona
//  - Usa Google Places API
//  - Salva JSON dentro /poi-db/verona.json
// ======================================

// ⚠️ NON INSERIRE QUI LA API KEY se usi variabile ambiente
// Lascia così:
const API_KEY = process.env.GOOGLE_API_KEY;

const fs = require("fs");
const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));


// ======================================
// FUNZIONI UTILITY
// ======================================
async function gsearch(query) {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=it&key=${API_KEY}`;
    const res = await fetch(url);
    return res.json();
}

// Classificazione ristoranti
function classifyRestaurant(types, price) {
    const t = (types || []).join(",").toLowerCase();

    if (t.includes("pizza")) return "pizza";
    if (t.includes("burger") || t.includes("fast_food")) return "hamburger";
    if (t.includes("cafe")) return "brunch";
    if (price >= 3) return "gourmet"; // caro = gourmet

    return "tipico";
}

// Classificazione hotel
function classifyHotel(price, types) {
    const t = (types || []).join(",").toLowerCase();

    if (t.includes("boutique")) return "boutique";
    if (!price || price <= 1) return "economico";
    if (price === 2) return "tre_stelle";
    if (price === 3) return "quattro_stelle";
    if (price >= 4) return "lusso";

    return "economico";
}


// Salvataggio file JSON
function saveJSON(city, data) {
    if (!fs.existsSync("./poi-db")) {
        fs.mkdirSync("./poi-db");
    }
    fs.writeFileSync(`./poi-db/${city}.json`, JSON.stringify(data, null, 2));
    console.log(`📁 Creato: poi-db/${city}.json`);
}


// ======================================
//  COSTRUZIONE DATABASE PER UNA CITTÀ
// ======================================
async function buildCity(cityName) {
    console.log(`\n🔵 Generazione database per: ${cityName}\n`);

    // 1️⃣ Trova il centro città
    console.log("📍 Recupero centro città...");
    const city = await gsearch(`${cityName} centro`);
    if (!city.results || !city.results.length) {
        console.error("❌ Errore: città non trovata.");
        return;
    }

    const center = city.results[0].geometry.location;

    // Struttura database
    const db = {
        center,
        restaurants: {
            pizza: [],
            tipico: [],
            hamburger: [],
            gourmet: [],
            brunch: []
        },
        hotels: {
            economico: [],
            tre_stelle: [],
            quattro_stelle: [],
            lusso: [],
            boutique: []
        },
        sights: []
    };

    // 2️⃣ Ristoranti
    console.log("🍕 Raccolta ristoranti...");
    const rest = await gsearch(`ristorante ${cityName}`);
    const restList = rest.results.slice(0, 20);

    restList.forEach(r => {
        const cat = classifyRestaurant(r.types || [], r.price_level || 2);
        if (db.restaurants[cat].length < 5) {
            db.restaurants[cat].push({
                name: r.name,
                rating: r.rating || null,
                address: r.formatted_address || "",
                photo: r.photos?.[0]?.photo_reference || null,
                location: r.geometry.location
            });
        }
    });

    // 3️⃣ Hotel
    console.log("🏨 Raccolta hotel...");
    const hotels = await gsearch(`hotel ${cityName}`);
    const hotelList = hotels.results.slice(0, 20);

    hotelList.forEach(h => {
        const cat = classifyHotel(h.price_level || 2, h.types || []);
        if (db.hotels[cat].length < 5) {
            db.hotels[cat].push({
                name: h.name,
                rating: h.rating || null,
                address: h.formatted_address || "",
                photo: h.photos?.[0]?.photo_reference || null,
                location: h.geometry.location
            });
        }
    });

    // 4️⃣ Attrazioni
    console.log("🏛️ Raccolta attrazioni...");
    const sights = await gsearch(`cose da vedere ${cityName}`);
    const sightsList = sights.results.slice(0, 20);

    sightsList.forEach(s => {
        if (db.sights.length < 5) {
            db.sights.push({
                name: s.name,
                rating: s.rating || null,
                address: s.formatted_address || "",
                photo: s.photos?.[0]?.photo_reference || null,
                location: s.geometry.location
            });
        }
    });

    // 5️⃣ Salva tutto
    saveJSON(cityName.toLowerCase(), db);
    console.log("\n✨ COMPLETATO!\n");
}

// LANCIA costruzione di VERONA
buildCity("Verona");

