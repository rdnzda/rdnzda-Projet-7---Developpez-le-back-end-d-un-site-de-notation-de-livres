const Book = require('../models/book')

exports.createBook = (req, res, next) => {
  const { book } = req.body;

  let bookData;
  try {
    bookData = JSON.parse(book);
  } catch (error) {
    return res.status(400).json({ error: 'Erreur lors de l\'analyse du livre en JSON' });
  }

  const webpFileName = req.file.filename.replace(/\.[^/.]+$/, '.webp');

  const newBook = new Book({
    userId: req.auth.userId,
    ...bookData,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${webpFileName}`,
    ratings: bookData.ratings,
    averageRating: bookData.averageRating,
  });
  

  newBook.save()
    .then((savedBook) => {
      res.status(201).json({ message: 'Livre enregistré !', book: savedBook });
    })
    .catch(error => res.status(400).json({ error }));
};

exports.getAllBooks = (req, res, next) => {
    Book.find()
      .then(books => res.status(200).json(books))
      .catch(error => res.status(400).json({ error }));
};

exports.getOneBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
      .then(book => res.status(200).json(book))
      .catch(error => res.status(404).json({ error }));
};

exports.modifyBook = (req, res, next) => {
  const bookId = req.params.id;

  if (req.file) {
    const imageData = req.file.buffer.toString('base64');
    const updatedBook = { imageUrl: `data:image/jpeg;base64,${imageData}`, ...req.body };

    Book.findOneAndUpdate({ _id: bookId }, updatedBook, { new: true })
      .then(updatedBook => {
        if (!updatedBook) {
          return res.status(404).json({ message: 'Livre non trouvé' });
        }
        res.status(200).json({ message: 'Livre modifié avec nouvelle image', book: updatedBook });
      })
      .catch(error => res.status(500).json({ error }));
  } else {
    const { title, author, year, genre, ratings } = req.body;
    const updatedBook = { title, author, year, genre, ratings };

    Book.findOneAndUpdate({ _id: bookId }, updatedBook, { new: true })
      .then(updatedBook => {
        if (!updatedBook) {
          return res.status(404).json({ message: 'Livre non trouvé' });
        }
        res.status(200).json({ message: 'Livre modifié', book: updatedBook });
      })
      .catch(error => res.status(500).json({ error }));
  }
};

exports.deleteBook = (req, res, next) => {
    Book.deleteOne({ _id: req.params.id })
      .then(() => res.status(200).json({ message: 'Livre supprimé !'}))
      .catch(error => res.status(400).json({ error }));
};

exports.setBookRating = async (req, res) => {
  const { userId, rating } = req.body;
  const bookId = req.params.id;

  try {
    // Vérifiez que la note est comprise entre 0 et 5
    if (rating < 0 || rating > 5) {
      return res.status(400).json({ error: 'La note doit être comprise entre 0 et 5.' });
    }

    // Recherchez le livre par son ID
    const book = await Book.findById(bookId);

    // Vérifiez si l'utilisateur a déjà noté ce livre
    const existingRating = book.ratings.find((r) => r.userId === userId);

    if (existingRating) {
      return res.status(400).json({ error: 'Vous avez déjà noté ce livre.' });
    }

    // Ajoutez la nouvelle note au tableau de notations
    book.ratings.push({ userId, grade: rating });

    // Calculez la nouvelle note moyenne
    const totalRatings = book.ratings.length;
    const totalRatingSum = book.ratings.reduce((sum, r) => sum + r.grade, 0);
    book.averageRating = totalRatingSum / totalRatings;

    // Enregistrez les modifications dans la base de données
    await book.save();

    // Renvoyez le livre mis à jour en réponse
    res.json(book);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour de la note du livre.' });
  }
};

exports.getBestRatingBooks = (req, res, next) => {
    Book.aggregate([
        {
            $sort: { averageRating: -1 }
        },
        {
            $limit: 3
        }
    ])
    .then(books => res.status(200).json(books))
    .catch(error => res.status(500).json({ error }));
};