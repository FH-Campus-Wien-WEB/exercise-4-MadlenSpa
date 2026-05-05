import { ButtonBuilder, ElementBuilder } from "./builders.js";

const messages = {
  dataLoadError: 'Data could not be loaded. Status',
  movieAlreadyInCollection: 'Movie is already in the collection.',
  addMovieFailed: 'Adding the movie failed.',
  deleteMovieFailed: 'Movie could not be deleted.',
  noResultsFound: 'No results found.',
  searchFailed: 'Search failed.',
  loginFailed: 'Login failed'
};

let currentSession = null;
let greetingTimeout = null;
let selectedGenres = [];
let currentTitleSearch = '';
let searchMoviesTimeout = null;
let logoutBackdropMovies = JSON.parse(localStorage.getItem('logoutBackdropMovies') || '[]');

function setSideMenuOpen(isOpen) {
  const menuOpenBtn = document.getElementById('menuOpenBtn');
  document.body.classList.toggle('menu-opened', isOpen);
  if (menuOpenBtn) {
    menuOpenBtn.setAttribute('aria-expanded', String(isOpen));
  }
}

function closeSideMenu() {
  setSideMenuOpen(false);
}

function saveLogoutBackdropMovies(movies) {
  logoutBackdropMovies = movies.filter(movie => movie.Poster && movie.Poster !== "N/A");
  localStorage.setItem('logoutBackdropMovies', JSON.stringify(logoutBackdropMovies));
}

function renderLogoutBackdrop() {
  const backdrop = document.getElementById('logoutBackdrop');
  backdrop.innerHTML = '';

  if (logoutBackdropMovies.length === 0) {
    document.body.classList.remove('logged-out');
    return;
  }

  const track = document.createElement('div');
  track.className = 'logout-backdrop-track';

  [...logoutBackdropMovies, ...logoutBackdropMovies].forEach(movie => {
    const poster = document.createElement('img');
    poster.src = movie.Poster;
    poster.alt = '';
    track.append(poster);
  });

  backdrop.append(track);
  document.body.classList.add('logged-out');
}

function hideLogoutBackdrop() {
  document.body.classList.remove('logged-out');
}

function openSearchDialog() {
  const searchForm = document.getElementById('searchForm');
  searchForm.reset();
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchDialog').showModal();
  document.getElementById('query').focus();
}

function appendMovie(movie, element) {
  // Build one movie card, including its dropdown actions for logged-in users.
  const movieId = movie.collectionId || movie.imdbID;
  const movieTitle = movie.Title || "Untitled movie";
  const genresList = Array.isArray(movie.Genres) ? movie.Genres : [];
  const actorsList = Array.isArray(movie.Actors) ? movie.Actors : [];
  const directorsList = Array.isArray(movie.Directors) ? movie.Directors : [];
  const writersList = Array.isArray(movie.Writers) ? movie.Writers : [];

  function closeMovieMenus() {
    document.querySelectorAll(".movie-actions.open").forEach(function (menu) {
      menu.classList.remove("open");
    });
  }

  function formatDate(isoDate) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return day + " " + month + " " + year;
  }

  function createCreditBlock(labelText, items) {
    const block = document.createElement("section");
    block.className = "credit-block";
    const label = document.createElement("h3");
    label.className = "info-label";
    label.textContent = labelText;
    const list = document.createElement("ul");
    items.forEach(function (item) {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
    block.append(label, list);
    return block;
  }

  const article = document.createElement("article");
  article.id = movieId;

  const header = document.createElement("header");
  const overviewSection = document.createElement("div");
  overviewSection.className = "overview";
  const detailsSection = document.createElement("div");
  detailsSection.className = "details";
  detailsSection.hidden = true;
  detailsSection.id = "details-" + movieId;
  const creditsSection = document.createElement("section");
  creditsSection.className = "credits";
  const ratingsSection = document.createElement("div");
  ratingsSection.className = "ratings-section";

  const title = document.createElement("h2");
  const titleText = document.createElement("span");
  titleText.textContent = movieTitle;
  title.append(titleText);
  header.append(title);

  if (currentSession) {
    const actionWrapper = document.createElement("div");
    actionWrapper.className = "movie-actions";
    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "movie-actions-toggle";
    menuButton.textContent = "...";
    menuButton.setAttribute("aria-label", `Show actions for ${movieTitle}`);
    const menu = document.createElement("div");
    menu.className = "movie-actions-menu";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.onclick = function () {
      openEditDialog(movieId);
    };
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.onclick = function () {
      deleteMovie(movieId);
    };

    menuButton.onclick = function (event) {
      event.stopPropagation();
      const isOpen = actionWrapper.classList.contains("open");
      closeMovieMenus();
      actionWrapper.classList.toggle("open", !isOpen);
    };

    actionWrapper.append(menuButton, menu);
    menu.append(editButton, deleteButton);
    article.append(actionWrapper);
  }

  const posterWrapper = document.createElement("div");
  posterWrapper.className = "poster-wrapper";
  if (movie.Poster && movie.Poster !== "N/A") {
    const poster = document.createElement("img");
    poster.src = movie.Poster;
    poster.alt = movieTitle + " poster";
    posterWrapper.append(poster);
  } else {
    const posterFallback = document.createElement("div");
    posterFallback.className = "poster-fallback";
    posterFallback.textContent = "No poster";
    posterWrapper.append(posterFallback);
  }
  overviewSection.append(posterWrapper);

  const meta = document.createElement("dl");
  meta.className = "meta";
  const releaseLabel = document.createElement("dt");
  releaseLabel.textContent = "Release:";
  const releaseValue = document.createElement("dd");
  const time = document.createElement("time");
  time.dateTime = movie.Released;
  time.textContent = formatDate(movie.Released);
  releaseValue.append(time);
  const separator = document.createElement("span");
  separator.className = "separator";
  separator.textContent = "|";
  const runtimeLabel = document.createElement("dt");
  runtimeLabel.textContent = "Runtime:";
  const runtimeValue = document.createElement("dd");
  runtimeValue.textContent = movie.Runtime + " min";
  meta.append(releaseLabel, releaseValue, separator, runtimeLabel, runtimeValue);
  overviewSection.append(meta);

  const genres = document.createElement("ul");
  genres.className = "genre-list";
  genresList.forEach(function (genre) {
    const genreItem = document.createElement("li");
    const genreSpan = document.createElement("span");
    genreSpan.className = "genre";
    if (selectedGenres.includes(genre)) {
      genreSpan.classList.add("selected");
    }
    genreSpan.textContent = genre;
    genreItem.append(genreSpan);
    genres.append(genreItem);
  });
  overviewSection.append(genres);

  const plotSection = document.createElement("section");
  const plotHeading = document.createElement("h3");
  plotHeading.className = "section-heading";
  plotHeading.textContent = "Plot:";
  const plot = document.createElement("p");
  plot.className = "plot";
  plot.textContent = movie.Plot;
  plotSection.append(plotHeading, plot);

  creditsSection.append(
    createCreditBlock("Directors:", directorsList),
    createCreditBlock("Writers:", writersList),
    createCreditBlock("Actors:", actorsList)
  );

  const ratings = document.createElement("div");
  ratings.className = "ratings";
  const metascore = document.createElement("span");
  metascore.textContent = "Metascore: " + movie.Metascore;
  const imdbRating = document.createElement("span");
  imdbRating.textContent = "IMDb Rating: " + movie.imdbRating;
  ratings.append(metascore, imdbRating);
  ratingsSection.append(ratings);

  const detailsToggle = document.createElement("button");
  detailsToggle.type = "button";
  detailsToggle.className = "details-toggle";
  detailsToggle.textContent = "See more";
  detailsToggle.setAttribute("aria-expanded", "false");
  detailsToggle.setAttribute("aria-controls", detailsSection.id);
  detailsToggle.onclick = function () {
    const isExpanded = !detailsSection.hidden;
    detailsSection.hidden = isExpanded;
    detailsToggle.textContent = isExpanded ? "See more" : "Show less";
    detailsToggle.setAttribute("aria-expanded", String(!isExpanded));
  };

  detailsSection.append(plotSection, creditsSection, ratingsSection);
  article.append(header, overviewSection, detailsToggle, detailsSection);
  element.append(article);
}

function updateGenres() {
  // Refresh the genre filter from the user's current collection.
  const listElement = document.querySelector("#filter");
  const header = listElement.previousElementSibling;

  listElement.innerHTML = '';

  if (!currentSession) {
    header.style.display = 'none';
    return;
  }

  fetch("/genres")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(genres => {
      header.style.display = 'block';
      const allButton = new ButtonBuilder("All").onclick(() => {
        selectedGenres = [];
        updateSelectedGenreButtons();
        loadMovies();
      }).appendTo(new ElementBuilder("li").appendTo(listElement));
      allButton.classList.add("active");

      for (const genre of genres) {
        const button = new ButtonBuilder(genre).onclick(() => {
          if (selectedGenres.includes(genre)) {
            selectedGenres = selectedGenres.filter(selectedGenre => selectedGenre !== genre);
          } else {
            selectedGenres.push(genre);
          }
          updateSelectedGenreButtons();
          loadMovies();
        }).appendTo(new ElementBuilder("li").appendTo(listElement));
        button.dataset.genre = genre;
      }

      updateSelectedGenreButtons();
      loadMovies();
    })
    .catch(error => {
      console.error('Failed to load genres:', error);
      listElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function updateSelectedGenreButtons() {
  document.querySelectorAll("#filter button").forEach(button => {
    if (button.dataset.genre) {
      button.classList.toggle("active", selectedGenres.includes(button.dataset.genre));
    } else {
      button.classList.toggle("active", selectedGenres.length === 0);
    }
  });
}

function updateFilterSummary() {
  const summary = document.getElementById("filterSummary");
  summary.innerHTML = '';

  if (!currentSession || (selectedGenres.length === 0 && !currentTitleSearch.trim())) {
    summary.classList.remove("visible");
    return;
  }

  const text = document.createElement("span");
  const parts = [];
  if (selectedGenres.length > 0) {
    parts.push("Genres: " + selectedGenres.join(", "));
  }
  if (currentTitleSearch.trim()) {
    parts.push('Title: "' + currentTitleSearch.trim() + '"');
  }
  text.textContent = "Showing " + parts.join(" | ");

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "Clear filters";
  clearButton.onclick = function () {
    selectedGenres = [];
    currentTitleSearch = '';
    document.getElementById('titleSearch').value = '';
    updateSelectedGenreButtons();
    loadMovies();
  };

  summary.append(text, clearButton);
  summary.classList.add("visible");
}

function removeMovies() {
  const mainElement = document.getElementById("movieGrid");
  while (mainElement.childElementCount > 0) {
    mainElement.firstChild.remove();
  }
}

function renderEmptyState(message, showAddButton = false) {
  const mainElement = document.getElementById("movieGrid");
  const emptyState = document.createElement("section");
  emptyState.className = "empty-state";
  const title = document.createElement("h2");
  title.textContent = message;
  emptyState.append(title);

  if (showAddButton) {
    const copy = document.createElement("p");
    copy.textContent = "Add your first movie and let the shelf drama begin.";
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "Add movies";
    addButton.onclick = openSearchDialog;
    emptyState.append(copy, addButton);
  }

  mainElement.append(emptyState);
}

function loadMovies() {
  // Load movies for the selected genre and render them into the main area.
  const url = new URL("/movies", location.href);

  fetch(url)
    .then(response => {
      removeMovies();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(movies => {
      const mainElement = document.getElementById("movieGrid");
      movies.sort((a, b) => (a.Title || '').localeCompare(b.Title || ''));
      saveLogoutBackdropMovies(movies);
      updateFilterSummary();

      if (movies.length === 0) {
        renderEmptyState("No movies yet", true);
        return;
      }

      const normalizedSearch = currentTitleSearch.trim().toLowerCase();
      const visibleMovies = movies.filter(movie => {
        const matchesTitle = !normalizedSearch || (movie.Title || '').toLowerCase().includes(normalizedSearch);
        const matchesGenre = selectedGenres.length === 0 ||
          selectedGenres.some(genre => (movie.Genres || []).includes(genre));
        return matchesTitle && matchesGenre;
      });

      if (visibleMovies.length === 0) {
        renderEmptyState("No movies match your filters.");
        return;
      }

      visibleMovies.forEach(movie => appendMovie(movie, mainElement));
    })
    .catch(error => {
      console.error('Failed to load movies:', error);
      const mainElement = document.getElementById("movieGrid");
      mainElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function addMovie(imdbID) {
  // Save a searched movie to the collection and refresh the visible lists.
  return fetch(`/movies/${imdbID}`, { method: 'PUT' })
    .then(response => {
      if (response.status === 201) {
        loadMovies();
        updateGenres();
        return true;
      } else if (response.status === 200) {
        alert(messages.movieAlreadyInCollection);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    })
    .catch(error => {
      console.error('Failed to add movie:', error);
      alert(messages.addMovieFailed);
    });
}

function removeSearchedMovie(imdbID) {
  return fetch(`/movies/${imdbID}`, { method: 'DELETE' })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const article = document.getElementById(imdbID);
      if (article) {
        article.remove();
      }
      saveLogoutBackdropMovies(logoutBackdropMovies.filter(movie => (movie.collectionId || movie.imdbID) !== imdbID));
      updateGenres();
      return true;
    })
    .catch(error => {
      console.error('Failed to remove searched movie:', error);
      alert(messages.deleteMovieFailed);
    });
}

function deleteMovie(imdbID) {
  // Delete a movie card and update the genre list afterwards.
  fetch(`/movies/${imdbID}`, { method: 'DELETE' })
    .then(response => {
      if (response.ok) {
        const article = document.getElementById(imdbID);
        if (article) {
          article.remove();
        }
        saveLogoutBackdropMovies(logoutBackdropMovies.filter(movie => (movie.collectionId || movie.imdbID) !== imdbID));
        updateGenres();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    })
    .catch(error => {
      console.error('Failed to delete movie:', error);
      alert(messages.deleteMovieFailed);
    });
}

function setEditFormMovie(movie) {
  const form = document.getElementById("editForm");
  for (const element of form.elements) {
    if (!element.id) continue;

    const name = element.id.replace("edit-", "");
    const value = movie[name];

    if (name === "Genres") {
      const selectedGenres = Array.isArray(value) ? value : [];
      Array.from(element.options).forEach(option => {
        option.selected = selectedGenres.includes(option.value);
      });
    } else if (name === "Actors" || name === "Directors" || name === "Writers") {
      element.value = Array.isArray(value) ? value.join(", ") : "";
    } else {
      element.value = value ?? "";
    }
  }
}

function getEditFormMovie() {
  const form = document.getElementById("editForm");
  const movie = {};
  const elements = Array.from(form.elements).filter(element => element.id);

  for (const element of elements) {
    const name = element.id.replace("edit-", "");
    let value;

    if (name === "Genres") {
      value = Array.from(element.options)
        .filter(option => option.selected)
        .map(option => option.value);
    } else if (name === "Metascore" || name === "Runtime" || name === "imdbRating") {
      value = Number(element.value);
    } else if (name === "Actors" || name === "Directors" || name === "Writers") {
      value = element.value.split(",").map(item => item.trim()).filter(Boolean);
    } else {
      value = element.value;
    }

    movie[name] = value;
  }

  return movie;
}

function openEditDialog(imdbID) {
  fetch(`/movies/${imdbID}`)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(movie => {
      setEditFormMovie(movie);
      document.getElementById("editDialog").showModal();
      document.getElementById("edit-Title").focus();
    })
    .catch(error => {
      console.error("Failed to load movie for editing:", error);
      alert(`${messages.dataLoadError} ${error.message}`);
    });
}

function saveEditedMovie() {
  const movie = getEditFormMovie();
  return fetch(`/movies/${movie.imdbID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(movie)
  })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      document.getElementById("editDialog").close();
      loadMovies();
      updateGenres();
    })
    .catch(error => {
      console.error("Failed to save movie:", error);
      alert(`Saving of movie data failed. Status ${error.message}`);
    });
}

function searchMovies(query) {
  // Search OMDb through the server and render add buttons for the results.
  fetch(`/search?query=${encodeURIComponent(query)}`)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(results => {
      const resultsDiv = document.getElementById("searchResults");
      resultsDiv.innerHTML = '';

      if (results.length === 0) {
        new ElementBuilder("p").class("search-empty").text(messages.noResultsFound).appendTo(resultsDiv);
        return;
      }

      for (const movie of results) {
        const entry = document.createElement("div");
        entry.id = "result-" + movie.imdbID;
        entry.className = "search-result";

        const title = document.createElement("span");
        title.className = "search-result-title";
        title.textContent = `${movie.Title} (${movie.Year})`;

        const addBtn = document.createElement("button");
        addBtn.dataset.added = String(Boolean(movie.added));
        addBtn.textContent = movie.added ? "Remove" : "Add";
        addBtn.classList.toggle("remove-result-button", Boolean(movie.added));
        addBtn.onclick = () => {
          if (addBtn.dataset.added === "true") {
            removeSearchedMovie(movie.imdbID).then(removed => {
              if (!removed) return;
              addBtn.dataset.added = "false";
              addBtn.textContent = "Add";
              addBtn.classList.remove("remove-result-button");
              loadMovies();
            });
          } else {
            addMovie(movie.imdbID).then(added => {
              if (!added) return;
              addBtn.dataset.added = "true";
              addBtn.textContent = "Added";
              addBtn.classList.add("remove-result-button");
              addBtn.classList.add("pulse");
              window.setTimeout(() => {
                addBtn.textContent = "Remove";
                addBtn.classList.remove("pulse");
              }, 900);
            });
          }
        };

        entry.append(title, addBtn);
        resultsDiv.append(entry);
      }
    })
    .catch(error => {
      console.error('Search failed:', error);
      const resultsDiv = document.getElementById("searchResults");
      new ElementBuilder("p").text(messages.searchFailed).appendTo(resultsDiv);
    });
}

window.onload = function () {
  const menuOpenBtn = document.getElementById('menuOpenBtn');
  const menuCloseBtn = document.getElementById('menuCloseBtn');
  const sideMenu = document.getElementById('sideMenu');

  function openSideMenu() {
    setSideMenuOpen(true);
  }

  menuOpenBtn.addEventListener('click', openSideMenu);
  menuCloseBtn.addEventListener('click', closeSideMenu);

  // Close any open movie action menu when the user clicks elsewhere.
  document.addEventListener("click", function (event) {
    if (
      document.body.classList.contains('menu-opened') &&
      !sideMenu.contains(event.target) &&
      !menuOpenBtn.contains(event.target)
    ) {
      closeSideMenu();
    }

    document.querySelectorAll(".movie-actions.open").forEach(function (menu) {
      menu.classList.remove("open");
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeSideMenu();
    document.querySelectorAll(".movie-actions.open").forEach(function (menu) {
      menu.classList.remove("open");
    });
  });

  // Restore an existing login session when the page loads.
  fetch("/session")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      currentSession = data || null;
      updateUI();
    })
    .catch(error => {
      console.error('Failed to load session:', error);
      currentSession = null;
      updateUI(false, true);
    });

  function hideUserGreeting() {
    const greetingElement = document.getElementById('userGreeting');
    greetingElement.classList.remove('visible');
    window.clearTimeout(greetingTimeout);
    greetingTimeout = null;
  }

  function showUserGreeting() {
    // Show a temporary login toast after a fresh login.
    if (!currentSession) return;

    const greetingElement = document.getElementById('userGreeting');
    const loginDate = new Date(currentSession.loginTime);
    const dateStr = loginDate.toLocaleDateString('en-US', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const timeStr = loginDate.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
    const title = document.createElement('strong');
    const details = document.createElement('span');

    title.textContent = `Hi ${currentSession.username} 👋`;
    details.textContent = `Logged in on ${dateStr} at ${timeStr}`;

    greetingElement.replaceChildren(title, details);
    greetingElement.classList.add('visible');

    window.clearTimeout(greetingTimeout);
    greetingTimeout = window.setTimeout(hideUserGreeting, 4500);
  }

  function updateUI(showGreeting = false, showLogin = false) {
    // Switch visible controls between logged-in and logged-out states.
    const authBtn = document.getElementById('authBtn');
    const addMoviesBtn = document.getElementById('addMoviesBtn');
    const movieToolsSection = document.getElementById('movieToolsSection');
    const menuOpenBtn = document.getElementById('menuOpenBtn');

    updateGenres();

    if (currentSession) {
      hideLogoutBackdrop();
      menuOpenBtn.style.display = 'flex';
      if (showGreeting) showUserGreeting();
      authBtn.textContent = 'Logout';
      authBtn.onclick = () => {
        fetch("/logout")
          .then(response => {
            if (response.ok) {
              currentSession = null;
              hideUserGreeting();
              updateUI(false, true);
            }
          })
          .catch(error => {
            console.error('Logout failed:', error);
          });
      };
      addMoviesBtn.style.display = 'inline';
      movieToolsSection.style.display = 'block';
    } else {
      closeSideMenu();
      removeMovies();
      hideUserGreeting();
      selectedGenres = [];
      currentTitleSearch = '';
      document.getElementById('titleSearch').value = '';
      updateFilterSummary();
      menuOpenBtn.style.display = 'none';
      authBtn.textContent = 'Login';
      authBtn.onclick = () => {
        const loginForm = document.getElementById('loginForm');
        loginForm.reset();
        document.getElementById('loginDialog').showModal();
        document.getElementById('username').focus();
      };
      addMoviesBtn.style.display = 'none';
      movieToolsSection.style.display = 'none';
      renderLogoutBackdrop();

      if (showLogin) {
        const loginDialog = document.getElementById('loginDialog');
        if (!loginDialog.open) {
          document.getElementById('loginForm').reset();
          loginDialog.showModal();
          document.getElementById('username').focus();
        }
      }
    }
  }

  // Submit login credentials and open the authenticated movie view.
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');

    fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(response => {
        if (!response.ok) {
          alert(messages.loginFailed);
          return;
        }
        return response.json().then(data => {
          currentSession = data;
          document.getElementById('loginDialog').close();
          updateUI(true);
          loadMovies();
        });
      })
      .catch(error => {
        console.error('Login failed:', error);
        alert(messages.loginFailed);
      });
  });

  document.getElementById('cancelLogin').addEventListener('click', () => {
    document.getElementById('loginDialog').close();
  });

  document.getElementById('titleSearch').addEventListener('input', (e) => {
    currentTitleSearch = e.target.value;
    loadMovies();
  });

  document.getElementById('clearTitleSearch').addEventListener('click', () => {
    const titleSearchInput = document.getElementById('titleSearch');
    currentTitleSearch = '';
    titleSearchInput.value = '';
    loadMovies();
    titleSearchInput.focus();
  });

  // Open and reset the movie search dialog.
  document.getElementById('addMoviesBtn').addEventListener('click', () => {
    openSearchDialog();
  });

  document.getElementById('clearSearchQuery').addEventListener('click', () => {
    const queryInput = document.getElementById('query');
    window.clearTimeout(searchMoviesTimeout);
    queryInput.value = '';
    document.getElementById('searchResults').innerHTML = '';
    queryInput.focus();
  });

  document.getElementById('closeSearchDialog').addEventListener('click', () => {
    document.getElementById('searchDialog').close();
  });

  document.getElementById('query').addEventListener('input', (e) => {
    const query = e.target.value.trim();
    window.clearTimeout(searchMoviesTimeout);
    if (query.length < 2) {
      document.getElementById('searchResults').innerHTML = '';
      return;
    }
    searchMoviesTimeout = window.setTimeout(() => searchMovies(query), 350);
  });

  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('query').value;
    searchMovies(query);
  });

  document.getElementById('closeEditDialog').addEventListener('click', () => {
    document.getElementById('editDialog').close();
  });

  document.getElementById('editForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveEditedMovie();
  });
};
