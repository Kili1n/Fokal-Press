// globals.js
let allMatches        = [];
let searchTeamsList   = [];
let currentlyFiltered = [];
let currentFilters    = { week: "", comp: "all", sport: "all", accredOnly: false, sortBy: "date", search: "", maxDist: 300 };
let userPosition      = null;
let matchToDelete     = null;
let isCalculating     = false;
let myFriends         = [];
let myFriendRequests  = [];
let mySavedFilters    = [];
let unsubUserListener = null;
let manualTeamsData = []; 
let manualCompsData = [];
let editingMatchId = null; 
let deferredPrompt = null;
let mapInstance = null;
let markersLayer = null;
let mapModal = null;
let advancedFilters = null;
let advFiltersBtn = null;
let mainHeader = null;

const travelCache = new Map();
const logoCache   = new Map();
const usersCache  = new Map();

let matchStatuses = JSON.parse(localStorage.getItem('matchStatuses') || '{}');
let matchArchives = JSON.parse(localStorage.getItem('matchArchives') || '{}');
