// Use local backend for spine images
export const IMG_URL_PREFIX : string = process.env.REACT_APP_API_URL 
    ? `${process.env.REACT_APP_API_URL.replace('/api', '')}/spine_images/`
    : "http://localhost:5001/spine_images/";
