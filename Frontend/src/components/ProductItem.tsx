import React, { useContext } from 'react';
import { shopContext } from '../context/shopContext';
import { Link } from 'react-router-dom';
import { assets } from '../assets/assets';

interface ProductItemProps {
  id: string;
  images: string[] | undefined;
  name: string;
  price: number;
  averageRating?: number;
  ratings?: number;
  stock?: number;
}

const ProductItem: React.FC<ProductItemProps> = ({ id, images, name, price, averageRating, ratings, stock }) => {
  const { currency } = useContext(shopContext)!;

  return (
    <div className="group relative block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
      <Link to={`/product/${id}`} className="block">
        <div className="relative overflow-hidden bg-gray-100 aspect-square">
          {images && Array.isArray(images) && images.length > 0 ? (
            <img
              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              src={images[0]}
              alt={name || 'product'}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
              No image
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100">
          <h3 className="text-base font-semibold text-gray-800 truncate" title={name}>
            {name}
          </h3>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {price} {currency}
          </p>
          {averageRating !== undefined && ratings !== undefined ? (
            <div className="flex items-center gap-1 mt-2">
              {[...Array(Math.floor(averageRating))].map((_, i) => (
                <img key={i} src={assets.star_icon} alt="star" className="w-3.5" />
              ))}
              {[...Array(5 - Math.floor(averageRating))].map((_, i) => (
                <img key={i} src={assets.star_dull_icon} alt="dull star" className="w-3.5" />
              ))}
              <p className="pl-2 text-sm text-gray-600">({ratings})</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2">No ratings yet</p>
          )}
          {stock !== undefined && (
            <p className="mt-2 text-sm font-medium text-red-500">
              {stock === 0 ? 'Out of Stock' : stock <= 5 ? `Only ${stock} items left in stock!` : ''}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
};

export default ProductItem;