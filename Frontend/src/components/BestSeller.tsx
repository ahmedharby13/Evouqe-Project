import React, { useContext, useEffect, useState } from 'react';
import { shopContext, Product } from '../context/shopContext';
import Title from './Title';
import ProductItem from './ProductItem';

const BestSeller: React.FC = () => {
  const { products } = useContext(shopContext)!;
  const [bestSellers, setBestSellers] = useState<Product[]>([]);

  useEffect(() => {
    const filteredProducts = products
      .filter((product) => product.bestseller === true)
      .slice(0, 5); // Limit to 5 products
    setBestSellers(filteredProducts);
  }, [products]);

  return (
    <div className="my-10">
      <div className="py-8 text-center text-3xl">
        <Title text1="BEST" text2="SELLERS" />
        <p className="w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600">
          Explore our top-selling pieces—timeless classics that started it all. Elevate your style with these foundational favorites!
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-4 gap-y-6">
        {bestSellers.length === 0 ? (
          <p className="text-center text-gray-500 col-span-full">No best sellers found.</p>
        ) : (
          bestSellers.map((item) => (
            <ProductItem
              key={item._id}
              id={item._id}
              name={item.name}
              images={item.images}
              price={item.price}
              averageRating={item.averageRating}
              ratings={item.ratings}
              stock={item.stock}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default BestSeller;