// components/MapDialog.jsx
import React, { useCallback, useState, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const defaultCenter = {
  lat: 7.2906,
  lng: 80.6337,
};

const MapDialog = ({ open, onClose, onSave, initialCoordinates }) => {
  const [selectedPosition, setSelectedPosition] = useState(initialCoordinates || defaultCenter);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyDZJHqgolRe_S3fjSzvktXaBqLEaMHp4_M', // Store key in .env file
  });

  useEffect(() => {
    if (initialCoordinates) {
      setSelectedPosition(initialCoordinates);
    }
  }, [initialCoordinates]);

  const handleMapClick = useCallback((e) => {
    setSelectedPosition({
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    });
  }, []);

  const handleSave = () => {
    onSave(selectedPosition);
    onClose();
  };

  if (loadError) return <div>Map failed to load</div>;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Select Coordinates</DialogTitle>
      <DialogContent dividers>
        {!isLoaded ? (
          <CircularProgress />
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={selectedPosition}
            zoom={14}
            onClick={handleMapClick}
          >
            <Marker position={selectedPosition} />
          </GoogleMap>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MapDialog;
