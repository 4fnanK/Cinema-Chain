// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title FilmRegistry
 * @dev A decentralized film registry for tracking watched films with ratings and reviews
 */
contract FilmRegistry {
    struct Film {
        string filmName;
        uint8 rating;      // Rating from 1 to 5 stars
        string review;
    }
    
    Film[] public films;
    
    event FilmAdded(uint256 indexed filmId, string filmName, uint8 rating, string review);
    
    /**
     * @dev Add a new film to the registry
     * @param _filmName The name of the film
     * @param _rating The rating (1-5 stars)
     * @param _review The review text
     */
    function addFilm(string memory _filmName, uint8 _rating, string memory _review) public {
        require(_rating >= 1 && _rating <= 5, "Rating must be between 1 and 5");
        films.push(Film(_filmName, _rating, _review));
        emit FilmAdded(films.length - 1, _filmName, _rating, _review);
    }
    
    /**
     * @dev Get all registered films
     * @return An array of all registered films
     */
    function getAllFilms() public view returns (Film[] memory) {
        return films;
    }
    
    /**
     * @dev Get the total number of registered films
     * @return The count of registered films
     */
    function getFilmCount() public view returns (uint256) {
        return films.length;
    }
}
