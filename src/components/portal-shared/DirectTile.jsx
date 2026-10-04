// src/components/portal-shared/DirectTile.jsx
import React, { memo, useCallback } from 'react';
import TileButton from './TileButton';

/**
 * Memoized direct tile component to prevent unnecessary re-renders.
 */
const DirectTile = memo(function DirectTile({ tile, onClick }) {
  return <TileButton tile={tile} onClick={onClick} isCategoryView={false} />;
});

DirectTile.displayName = 'DirectTile';

export default DirectTile;
