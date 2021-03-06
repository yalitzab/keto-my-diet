const { AuthenticationError } = require('apollo-server-express');
const { User, Category, Recipe } = require('../models');
const { signToken } = require('../utils/auth');
// const stripe = require('stripe')('sk_test_4eC39HqLyjWDarjtT1zdp7dc');

const resolvers = {
  Query: {
    // Category
    categories: async () => {
      return await Category.find();
    },
    // Recipes
    recipes: async (parent, { category, name }, context) => {
      const params = {};

      if (category) {
        params.category = category;
      }

      if (name) {
        params.name = {
          $regex: name
        };
      }

      return await User.findById(context.user._id).populate('recipes')
    },
    recipe: async (parent, { _id }) => {
      return await Recipe.findById(_id).populate('category');
    },

    user: async (parent, args, context) => {
      if (context.user) {
        const user = await User.findById(context.user._id).populate({
          path: 'recipes',
          populate: 'category'
        });

        //   user.orders.sort((a, b) => b.purchaseDate - a.purchaseDate);

        return user;
      }

      throw new AuthenticationError('Not logged in');
    },

  },
  Mutation: {
    addUser: async (parent, args) => {
      const user = await User.create(args);
      const token = signToken(user);

      return { token, user };
    },

    updateUser: async (parent, args, context) => {
      if (context.user) {
        return await User.findByIdAndUpdate(context.user._id, args, { new: true });
      }

      throw new AuthenticationError('Not logged in');
    },

    addRecipe: async (parent, { name, ingredients, instructions, image, category, like }, context) => {
      console.log(context, name);
      if (context.user) {
       console.log("Hello", name);
        let recipe = await Recipe.create({
          name: name, ingredients: ingredients, instructions: instructions, image: image, category: category, like: like
        })

       const user = await User.findByIdAndUpdate(
          { _id: context.user._id }, 
          { $push: { recipes: recipe._id } },
          { new: true }
          );

      //   console.log(recipe)
        return  user;
       
        // return {...recipe._doc};
        // return {...thing._doc};
      }

      throw new AuthenticationError('You need to be logged in!');
    },

    updateRecipe: async (parent, { _id }) => {
      const decrement = Math.abs(like) * -1;

      return await Recipe.findByIdAndUpdate(_id, { new: true });
    },

    addLike: async (parent, { recipeId, likeBody}, context) => {
      if (context.user) {
        const updatedRecipe = await Recipe.findOneAndUpdate(
          { _id: recipeId },
          {$push: { likes: {likeBody, username: context.user.firstName }}},
          { new: true, runValidators: true }
        );
        return updatedRecipe;
      }
      throw new AuthenticationError('You need to be logged in!');
    },

    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AuthenticationError('Incorrect credentials');
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError('Incorrect credentials');
      }

      const token = signToken(user);

      return { token, user };
    }
  }
};

module.exports = resolvers;
