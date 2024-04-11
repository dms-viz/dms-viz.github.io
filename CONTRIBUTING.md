## Introduction

Welcome to the `dms-viz` project! [dms-viz](https://dms-viz.github.io/) is an interactive tool for visualizing mutation-level data in the context of a 3D protein structure. The tool consists of two parts:

1. A Command Line Interface (CLI) for formatting data into a JSON file that can be uploaded
   to
2. An interactive web-based visualization tool written with Javascript.

This repository contains the code for the interactive visualization component of `dms-viz`. We are always looking for ways to improve and are happy to welcome contributions from the community.

Detailed instructions for contributing to the `dms-viz` project are available in the documentation [here](https://dms-viz.github.io/dms-viz-docs/).

## Getting Started

### Environment Setup

The development of dms-viz utilizes `npm`, the JavaScript package manager, and [`Vite`](https://vitejs.dev/), the build tool.

To begin contributing, follow these steps:

1. Clone the repository to your local machine.

2. Install the necessary dependencies specified in the package.json file by running the command:

```bash
npm install
```

To start development, you'll need to run the local server using Vite. This can be done with the command:

```bash
npm run dev
```

This command will start a local development server and open up a browser window. Most changes are reflected live without having to restart the server.

## How to Contribute

Contributions are made through the Fork and Pull Request workflow. If you're unfamiliar with this workflow, here's a simplified overview:

First, you'll need to create a fork of the dms-viz repository on your own GitHub account.
Make your changes in your forked repository.

Once you're done with your changes, create a pull request to propose your changes to the dms-viz main repository.

Your pull request will then be reviewed and, if everything looks good, your changes will be merged into the main repository.

Remember to fetch the latest changes from the main repository before you start working on new features or fixes.

## Code Guidelines

We aim for clean and consistent code across the entire project. To this end, we use `ESLint` for linting and `Prettier` for code formatting. Make sure to install these extensions in your code editor. Before making a Pull Request, ensure your code adheres to these formatting guidelines.
