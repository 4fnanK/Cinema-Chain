const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FilmRegistry", function () {
  let filmRegistry;
  let owner;
  let addr1;
  let addr2;

  // Deploy contract before each test
  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const FilmRegistry = await ethers.getContractFactory("FilmRegistry");
    filmRegistry = await FilmRegistry.deploy();
    await filmRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const address = await filmRegistry.getAddress();
      expect(address).to.not.equal(0);
      expect(address).to.not.equal("");
      expect(address).to.not.equal(null);
      expect(address).to.not.equal(undefined);
    });

    it("Should start with zero films", async function () {
      const filmCount = await filmRegistry.getFilmCount();
      expect(filmCount).to.equal(0);
    });
  });

  describe("Film Addition", function () {
    it("Should add a film successfully", async function () {
      const tx = await filmRegistry.addFilm("The Matrix", 5, "Mind-blowing sci-fi masterpiece!");
      await tx.wait();

      const filmCount = await filmRegistry.getFilmCount();
      expect(filmCount).to.equal(1);
    });

    it("Should emit FilmAdded event", async function () {
      await expect(filmRegistry.addFilm("Inception", 5, "Amazing visuals and story"))
        .to.emit(filmRegistry, "FilmAdded")
        .withArgs(0, "Inception", 5, "Amazing visuals and story");
    });

    it("Should add multiple films", async function () {
      await filmRegistry.addFilm("The Godfather", 5, "Classic masterpiece");
      await filmRegistry.addFilm("Pulp Fiction", 4, "Tarantino's best");
      await filmRegistry.addFilm("The Dark Knight", 5, "Best superhero film");

      const filmCount = await filmRegistry.getFilmCount();
      expect(filmCount).to.equal(3);
    });

    it("Should store film details correctly", async function () {
      await filmRegistry.addFilm("Interstellar", 5, "Epic space journey");
      
      const film = await filmRegistry.films(0);
      expect(film.filmName).to.equal("Interstellar");
      expect(film.rating).to.equal(5);
      expect(film.review).to.equal("Epic space journey");
    });

    it("Should reject rating below 1", async function () {
      await expect(
        filmRegistry.addFilm("Bad Film", 0, "Invalid rating")
      ).to.be.revertedWith("Rating must be between 1 and 5");
    });

    it("Should reject rating above 5", async function () {
      await expect(
        filmRegistry.addFilm("Great Film", 6, "Invalid rating")
      ).to.be.revertedWith("Rating must be between 1 and 5");
    });

    it("Should accept all valid ratings from 1 to 5", async function () {
      await filmRegistry.addFilm("Film 1", 1, "Poor");
      await filmRegistry.addFilm("Film 2", 2, "Below Average");
      await filmRegistry.addFilm("Film 3", 3, "Average");
      await filmRegistry.addFilm("Film 4", 4, "Good");
      await filmRegistry.addFilm("Film 5", 5, "Excellent");

      const filmCount = await filmRegistry.getFilmCount();
      expect(filmCount).to.equal(5);
    });
  });

  describe("Film Retrieval", function () {
    beforeEach(async function () {
      // Add some test films
      await filmRegistry.addFilm("Shawshank Redemption", 5, "Hope is a good thing");
      await filmRegistry.addFilm("Forrest Gump", 4, "Life is like a box of chocolates");
      await filmRegistry.addFilm("Fight Club", 5, "First rule: don't talk about it");
    });

    it("Should return all films", async function () {
      const films = await filmRegistry.getAllFilms();
      expect(films.length).to.equal(3);
    });

    it("Should return correct film details", async function () {
      const films = await filmRegistry.getAllFilms();
      
      expect(films[0].filmName).to.equal("Shawshank Redemption");
      expect(films[0].rating).to.equal(5);
      expect(films[0].review).to.equal("Hope is a good thing");
      
      expect(films[1].filmName).to.equal("Forrest Gump");
      expect(films[1].rating).to.equal(4);
      expect(films[1].review).to.equal("Life is like a box of chocolates");
      
      expect(films[2].filmName).to.equal("Fight Club");
      expect(films[2].rating).to.equal(5);
      expect(films[2].review).to.equal("First rule: don't talk about it");
    });

    it("Should handle empty review", async function () {
      await filmRegistry.addFilm("Test Film", 3, "");
      const filmCount = await filmRegistry.getFilmCount();
      expect(filmCount).to.equal(4);
    });
  });

  describe("Gas Optimization", function () {
    it("Should track gas usage for adding a film", async function () {
      const tx = await filmRegistry.addFilm("Gas Test", 4, "Testing gas efficiency");
      const receipt = await tx.wait();
      
      console.log(`      ⛽ Gas used for adding film: ${receipt.gasUsed.toString()}`);
      
      // Ensure gas usage is reasonable (adjust threshold as needed)
      expect(receipt.gasUsed).to.be.lessThan(150000n);
    });
  });
});
