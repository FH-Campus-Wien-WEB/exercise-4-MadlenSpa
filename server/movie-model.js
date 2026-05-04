const fs = require('fs');
const path = require('path');

const moviesFile = path.join(__dirname, 'movies.json');
let movies = JSON.parse(fs.readFileSync(moviesFile, 'utf8'));

// Persist the in-memory movie data back to the JSON file.
function saveMovies() {
  fs.writeFileSync(moviesFile, JSON.stringify(movies, null, 2), 'utf8');
}

// Return all movies that belong to one user.
function getUserMovies(username) {
  return movies[username] || {};
}

// Look up one movie in one user's collection.
function getUserMovie(username, imdbID) {
  const userMovies = getUserMovies(username);
  return userMovies[imdbID];
}

// Check whether a movie already exists for a user.
function hasUserMovie(username, imdbID) {
  return getUserMovie(username, imdbID) !== undefined;
}

// Insert or replace a user's movie and save the change.
function setUserMovie(username, imdbID, movie) {
  if (!movies[username]) {
    movies[username] = {};
  }
  const exists = imdbID in movies[username];
  movies[username][imdbID] = movie;
  saveMovies();
  return exists;
}

// Remove a user's movie if it exists.
function deleteUserMovie(username, imdbID) {
  if (!movies[username] || !(imdbID in movies[username])) {
    return false;
  }
  delete movies[username][imdbID];
  saveMovies();
  return true;
}

// Collect every unique genre from one user's movies.
function getGenres(username) {
  return [...new Set(Object.values(getUserMovies(username)).flatMap((movie) => movie.Genres || []))];
}

module.exports = {
  getUserMovies,
  getUserMovie,
  hasUserMovie,
  setUserMovie,
  deleteUserMovie,
  getGenres,
};
