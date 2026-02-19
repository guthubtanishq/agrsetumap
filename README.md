# Orbit View - Advanced Satellite Map Application

A high-performance, modern satellite map application built with React, Mapbox GL JS, and Tailwind CSS. Features include 3D terrain, measurement tools, and a glassmorphic UI.

## Features

-   **High-Resolution Satellite Imagery**: Using `mapbox://styles/mapbox/satellite-streets-v12`.
-   **3D Terrain**: Realistic terrain visualization with `mapbox-terrain-dem-v1`.
-   **Measurement Tools**: Calculate distance and area instantly by drawing lines and polygons.
-   **Search**: Global location search with geocoding.
-   **Geolocation**: Automatically zoom to user's location.
-   **Real-time Coordinates**: Display latitude, longitude, and zoom level.
-   **Visual Enhancements**: Glassmorphism controls, smooth animations, and atmospheric sky layer.

## Setup

1.  **Clone the repository**.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Mapbox Token**:
    -   Create a `.env` file in the root directory.
    -   Add your Mapbox Access Token:
        ```bash
        VITE_MAPBOX_TOKEN=pk.your_token_here
        ```
    -   Keep your token secure! Don't commit `.env` to version control.
4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
5.  **Build for Production**:
    ```bash
    npm run build
    ```

## Usage

-   **Search**: Use the top-left search bar to find any location.
-   **Measure**: Use the draw tools on the top-left (Polygon/Line/Point) to measure areas and distances. Results appear floating on screen.
-   **3D Mode**: Toggle 3D terrain using the button in the control panel.
-   **Rotate/Reset**: Use the compass button or right-click drag to rotate the view.

## Tech Stack

-   **Framework**: React (Vite)
-   **Map Engine**: Mapbox GL JS
-   **Styling**: Tailwind CSS v4
-   **Icons**: Lucide React
-   **Geospatial Analysis**: Turf.js
