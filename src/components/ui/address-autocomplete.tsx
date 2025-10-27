import { useState, useCallback, useEffect } from 'react';
import { Autocomplete, LoadScript } from '@react-google-maps/api';
import { Input } from './input';
import { Label } from './label';

const libraries: ("places")[] = ["places"];

interface AddressComponents {
  street: string;
  city: string;
  state: string;
  zip: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressComponents) => void;
  onManualChange?: (street: string) => void;
  defaultValue?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function AddressAutocomplete({
  onAddressSelect,
  onManualChange,
  defaultValue = '',
  label = 'Address',
  placeholder = 'Start typing your address...',
  required = false
}: AddressAutocompleteProps) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(defaultValue);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue]);

  const onLoad = useCallback((autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
    
    // Restrict to US addresses only
    autocompleteInstance.setComponentRestrictions({ country: 'us' });
    
    // Set fields to return
    autocompleteInstance.setFields([
      'address_components',
      'formatted_address',
      'geometry'
    ]);
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      
      if (!place.address_components || !place.geometry) {
        return;
      }

      let street = '';
      let city = '';
      let state = '';
      let zip = '';

      // Parse address components
      place.address_components.forEach(component => {
        const types = component.types;
        
        if (types.includes('street_number')) {
          street = component.long_name;
        }
        if (types.includes('route')) {
          street = street ? `${street} ${component.long_name}` : component.long_name;
        }
        if (types.includes('locality')) {
          city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          state = component.short_name;
        }
        if (types.includes('postal_code')) {
          zip = component.long_name;
        }
      });

      const addressData: AddressComponents = {
        street,
        city,
        state,
        zip,
        fullAddress: place.formatted_address || '',
        lat: place.geometry.location?.lat() || 0,
        lng: place.geometry.location?.lng() || 0
      };

      setInputValue(addressData.fullAddress);
      onAddressSelect(addressData);
    }
  }, [autocomplete, onAddressSelect]);

  if (!apiKey) {
    return (
      <div className="space-y-2">
        <Label htmlFor="address">{label}</Label>
        <Input
          id="address"
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onManualChange?.(e.target.value);
          }}
          onBlur={() => {
            if (inputValue?.trim()) {
              onAddressSelect({
                street: inputValue.trim(),
                city: '',
                state: '',
                zip: '',
                fullAddress: inputValue.trim(),
                lat: 0,
                lng: 0
              });
            }
          }}
          required={required}
          style={{ fontSize: '16px' }} // Prevents iOS zoom
        />
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
      <div className="space-y-2">
        <Label htmlFor="address">{label}</Label>
        <Autocomplete
          onLoad={onLoad}
          onPlaceChanged={onPlaceChanged}
        >
          <Input
            id="address"
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onManualChange?.(e.target.value);
            }}
            onBlur={() => {
              if (inputValue?.trim()) {
                onAddressSelect({
                  street: inputValue.trim(),
                  city: '',
                  state: '',
                  zip: '',
                  fullAddress: inputValue.trim(),
                  lat: 0,
                  lng: 0
                });
              }
            }}
            required={required}
            style={{ fontSize: '16px' }} // Prevents iOS zoom on mobile
          />
        </Autocomplete>
      </div>
    </LoadScript>
  );
}
