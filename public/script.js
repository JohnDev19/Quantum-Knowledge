class QAApp {
  constructor() {
    this.initializeDOM();
    this.bindEvents();
    this.currentPage = 1;
    this.resultsPerPage = 6;
    this.allResults = [];
    this.currentKeyword = '';
  }

  initializeDOM() {
    this.elements = {
      searchInput: document.getElementById('searchInput'),
      searchButton: document.querySelector('.search-container button'),
      resultsContainer: document.getElementById('resultsContainer'),
      loadingSpinner: document.getElementById('loadingSpinner'),
      errorMessage: document.getElementById('errorMessage'),
      questionForm: document.getElementById('questionForm'),
      questionTitle: document.getElementById('questionTitle'),
      questionDescription: document.getElementById('questionDescription'),
      modal: document.getElementById('modal'),
      modalTitle: document.getElementById('modalTitle'),
      modalDescription: document.getElementById('modalDescription'),
      closeModalButton: document.querySelector('.modal .close-btn')
    };

    if (!this.validateElements()) {
      console.error('Critical DOM elements are missing');
      return;
    }
  }

  validateElements() {
    const requiredElements = [
      'searchInput',
      'searchButton',
      'resultsContainer',
      'loadingSpinner',
      'errorMessage',
      'questionForm',
      'questionTitle',
      'questionDescription',
      'modal',
      'modalTitle',
      'modalDescription'
    ];

    return requiredElements.every(key => this.elements[key] !== null);
  }

  bindEvents() {
    this.elements.searchButton.addEventListener('click', () => this.performSearch());
    this.elements.searchInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') this.performSearch();
    });

    this.elements.questionForm.addEventListener('submit',
      this.handleQuestionSubmit.bind(this));

    document.body.addEventListener('click',
      (event) => {
        if (event.target.classList.contains('result-card')) {
          const title = event.target.querySelector('h3').textContent;
          const description = event.target.querySelector('p').dataset.fullDescription;
          this.openModal(title, description);
        }
      });

    this.elements.closeModalButton.addEventListener('click',
      () => {
        this.closeModal();
      });
  }

  async performSearch() {
    const keyword = this.elements.searchInput.value.trim();

    if (!keyword) {
      this.showNotification('Please enter a search keyword', 'warning');
      return;
    }

    try {
      this.clearResults();
      this.showLoadingState();
      this.currentKeyword = keyword;

      const response = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const results = await response.json();
      this.hideLoadingState();

      if (results.length > 0) {
        this.displaySearchResults(results, keyword);
      } else {
        this.displayNoResults(keyword);
      }

    } catch (error) {
      this.handleSearchError(error);
    }
  }

  displaySearchResults(results, keyword) {
    this.allResults = results;
    this.currentPage = 1;
    this.renderResultsPage(keyword);

    if (results.length > this.resultsPerPage) {
      this.addPaginationControls();
    }
  }

  renderResultsPage(keyword) {
    this.elements.resultsContainer.innerHTML = '';

    const startIndex = (this.currentPage - 1) * this.resultsPerPage;
    const endIndex = startIndex + this.resultsPerPage;
    const pageResults = this.allResults.slice(startIndex, endIndex);

    pageResults.forEach(item => {
      const resultCard = document.createElement('div');
      resultCard.classList.add('result-card');

      const shortDescription = this.truncateText(item.answer, 100); // Limit / 100 characters

      resultCard.innerHTML = `
      <h3>${this.highlightText(item.question, keyword)}</h3>
      <p data-full-description="${item.answer}">${this.highlightText(shortDescription, keyword)} ...</p>
      <div class="tags">
      <span class="tag">Q&A</span>
      <span class="tag">${this.getWordCount(item.answer)} words</span>
      </div>
      `;

      this.elements.resultsContainer.appendChild(resultCard);
    });

    this.updatePaginationDisplay();
  }

  truncateText(text, length) {
    if (text.length > length) {
      return text.slice(0, length) + '...';
    }
    return text;
  }

  openModal(title, description) {
    this.elements.modalTitle.textContent = title;
    this.elements.modalDescription.textContent = description;
    this.elements.modal.style.display = 'block';
  }

  closeModal() {
    this.elements.modal.style.display = 'none';
  }

  addPaginationControls() {
    const existingPagination = document.querySelector('.pagination-container');
    if (existingPagination) {
      existingPagination.remove();
    }

    const paginationContainer = document.createElement('div');
    paginationContainer.classList.add('pagination-container');
    paginationContainer.innerHTML = `
    <div class="pagination-controls">
    <button id="prevButton" class="pagination-btn">
    <i class="fas fa-chevron-left"></i> Previous
    </button>
    <span id="pageInfo" class="page-info"></span>
    <button id="nextButton" class="pagination-btn">
    Next <i class="fas fa-chevron-right"></i>
    </button>
    </div>
    `;

    this.elements.resultsContainer.after(paginationContainer);

    document.getElementById('prevButton').addEventListener('click', () => this.changePage(-1));
    document.getElementById('nextButton'). addEventListener('click', () => this.changePage(1));
  }

  changePage(direction) {
    const totalPages = Math.ceil(this.allResults.length / this.resultsPerPage);

    this.currentPage += direction;
    this.currentPage = Math.max(1, Math.min(this.currentPage, totalPages));

    this.renderResultsPage(this.currentKeyword);
  }

  updatePaginationDisplay() {
    const pageInfoElement = document.getElementById('pageInfo');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    if (pageInfoElement && prevButton && nextButton) {
      const totalPages = Math.ceil(this.allResults.length / this.resultsPerPage);

      pageInfoElement.textContent = `Page ${this.currentPage} of ${totalPages}`;

      prevButton.disabled = this.currentPage === 1;
      nextButton.disabled = this.currentPage === totalPages;
    }
  }

  displayNoResults(keyword) {
    this.elements.resultsContainer.innerHTML = `
    <div class="no-results">
    <h3>No Results Found</h3>
    <p>Your search for "${keyword}" did not match any questions.</p>
    <p>Try different keywords or search new content.</p>
    </div>
    `;
  }

  handleSearchError(error) {
    console.error('Search Error:', error);
    this.hideLoadingState();

    this.showNotification(
      error.message === 'Failed to fetch'
      ? 'Network error. Check your connection.': 'An unexpected error occurred. Please try again.',
      'error'
    );
  }

  async handleQuestionSubmit(event) {
    event.preventDefault();

    const questionTitle = this.elements.questionTitle.value.trim();
    const questionDescription = this.elements.questionDescription.value.trim();

    if (!questionTitle || !questionDescription) {
      this.showNotification('Please fill in all fields', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: questionTitle,
          answer: questionDescription
        })
      });

      if (response.ok) {
        this.showNotification('Content submitted successfully!', 'success');
        event.target.reset();
      } else {
        this.showNotification('Failed to submit content', 'error');
      }
    } catch (error) {
      console.error('Submission Error:', error);
      this.showNotification('Network error. Please try again.', 'error');
    }
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  highlightText(text, keyword) {
    if (!keyword) return text;

    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  getWordCount(text) {
    return text.trim().split(/\s+/).length;
  }

  clearResults() {
    this.elements.resultsContainer.innerHTML = '';
    this.elements.errorMessage.style.display = 'none';
  }

  showLoadingState() {
    this.elements.loadingSpinner.style.display = 'block';
  }

  hideLoadingState() {
    this.elements.loadingSpinner.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new QAApp();
});