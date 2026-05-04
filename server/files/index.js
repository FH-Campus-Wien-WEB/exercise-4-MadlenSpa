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

function appendMovie(movie, element) {
  // Build one movie card, including its dropdown actions for logged-in users.
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
  article.id = movie.imdbID;

  const header = document.createElement("header");
  const overviewSection = document.createElement("div");
  overviewSection.className = "overview";
  const detailsSection = document.createElement("div");
  detailsSection.className = "details";
  const creditsSection = document.createElement("section");
  creditsSection.className = "credits";
  const ratingsSection = document.createElement("div");
  ratingsSection.className = "ratings-section";

  const title = document.createElement("h2");
  title.textContent = movie.Title;
  header.append(title);

  if (currentSession) {
    const actionWrapper = document.createElement("div");
    actionWrapper.className = "movie-actions";
    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "movie-actions-toggle";
    menuButton.textContent = "...";
    menuButton.setAttribute("aria-label", `Show actions for ${movie.Title}`);
    const menu = document.createElement("div");
    menu.className = "movie-actions-menu";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.onclick = function () {
      location.href = "edit.html?imdbID=" + movie.imdbID;
    };
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.onclick = function () {
      deleteMovie(movie.imdbID);
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
  const poster = document.createElement("img");
  poster.src = movie.Poster;
  poster.alt = movie.Title + " poster";
  posterWrapper.append(poster);
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
  movie.Genres.forEach(function (genre) {
    const genreItem = document.createElement("li");
    const genreSpan = document.createElement("span");
    genreSpan.className = "genre";
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
    createCreditBlock("Actors:", movie.Actors),
    createCreditBlock("Directors:", movie.Directors),
    createCreditBlock("Writers:", movie.Writers)
  );

  const ratings = document.createElement("div");
  ratings.className = "ratings";
  const metascore = document.createElement("span");
  metascore.textContent = "Metascore: " + movie.Metascore;
  const imdbRating = document.createElement("span");
  imdbRating.textContent = "IMDb Rating: " + movie.imdbRating;
  ratings.append(metascore, imdbRating);
  ratingsSection.append(ratings);

  detailsSection.append(plotSection, creditsSection);
  article.append(header, overviewSection, detailsSection, ratingsSection);
  element.append(article);
}

function updateGenres() {
  // Refresh the genre filter from the user's current collection.
  const header = document.querySelector('nav>h2');
  const listElement = document.querySelector("#filter");

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
      new ElementBuilder("li").append(new ButtonBuilder("All").onclick(() => loadMovies()))
        .appendTo(listElement);

      for (const genre of genres) {
        new ElementBuilder("li").append(new ButtonBuilder(genre).onclick(() => loadMovies(genre)))
          .appendTo(listElement);
      }

      const firstButton = listElement.querySelector("button");
      if (firstButton) {
        firstButton.click();
      }
    })
    .catch(error => {
      console.error('Failed to load genres:', error);
      listElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function removeMovies() {
  const mainElement = document.querySelector("main");
  while (mainElement.childElementCount > 0) {
    mainElement.firstChild.remove();
  }
}

function loadMovies(genre) {
  // Load movies for the selected genre and render them into the main area.
  const url = new URL("/movies", location.href);
  if (genre) {
    url.searchParams.set("genre", genre);
  }

  fetch(url)
    .then(response => {
      removeMovies();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(movies => {
      const mainElement = document.querySelector("main");
      movies.forEach(movie => appendMovie(movie, mainElement));
    })
    .catch(error => {
      console.error('Failed to load movies:', error);
      const mainElement = document.querySelector("main");
      mainElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function addMovie(imdbID) {
  // Save a searched movie to the collection and refresh the visible lists.
  fetch(`/movies/${imdbID}`, { method: 'PUT' })
    .then(response => {
      if (response.status === 201) {
        const entry = document.getElementById("result-" + imdbID);
        if (entry) entry.remove();
        loadMovies();
        updateGenres();
      } else if (response.status === 200) {
        alert(messages.movieAlreadyInCollection);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    })
    .catch(error => {
      console.error('Failed to add movie:', error);
      alert(messages.addMovieFailed);
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
        new ElementBuilder("p").text(messages.noResultsFound).appendTo(resultsDiv);
        return;
      }

      for (const movie of results) {
        const entry = document.createElement("div");
        entry.id = "result-" + movie.imdbID;

        const title = document.createElement("span");
        title.textContent = `${movie.Title} (${movie.Year})`;

        const addBtn = document.createElement("button");
        addBtn.textContent = "Add";
        addBtn.onclick = () => addMovie(movie.imdbID);

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
  // Close any open movie action menu when the user clicks elsewhere.
  document.addEventListener("click", function () {
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
      updateUI();
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

  function updateUI(showGreeting = false) {
    // Switch visible controls between logged-in and logged-out states.
    const authBtn = document.getElementById('authBtn');
    const addMoviesBtn = document.getElementById('addMoviesBtn');

    updateGenres();

    if (currentSession) {
      if (showGreeting) showUserGreeting();
      authBtn.textContent = 'Logout';
      authBtn.onclick = () => {
        fetch("/logout")
          .then(response => {
            if (response.ok) {
              currentSession = null;
              hideUserGreeting();
              updateUI();
            }
          })
          .catch(error => {
            console.error('Logout failed:', error);
          });
      };
      addMoviesBtn.style.display = 'inline';
    } else {
      removeMovies();
      hideUserGreeting();
      authBtn.textContent = 'Login';
      authBtn.onclick = () => {
        const loginForm = document.getElementById('loginForm');
        loginForm.reset();
        document.getElementById('loginDialog').showModal();
      };
      addMoviesBtn.style.display = 'none';
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

  // Open and reset the movie search dialog.
  document.getElementById('addMoviesBtn').addEventListener('click', () => {
    const searchForm = document.getElementById('searchForm');
    searchForm.reset();
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchDialog').showModal();
  });

  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('query').value;
    searchMovies(query);
  });

  document.getElementById('cancelSearch').addEventListener('click', () => {
    document.getElementById('searchDialog').close();
  });
};
