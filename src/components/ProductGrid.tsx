import productBlackTea from "@/assets/product-black-tea.jpg";
import productGreenTea from "@/assets/product-green-tea.jpg";
import productHerbalTea from "@/assets/product-herbal-tea.jpg";
import productIcedTea from "@/assets/product-iced-tea.jpg";

const products = [
  {
    id: 1,
    name: "Black Tea",
    description: "Rich & Bold Flavor",
    image: productBlackTea,
    color: "bg-lipton-dark",
  },
  {
    id: 2,
    name: "Green Tea",
    description: "Fresh & Light",
    image: productGreenTea,
    color: "bg-lipton-green",
  },
  {
    id: 3,
    name: "Herbal Tea",
    description: "Naturally Caffeine Free",
    image: productHerbalTea,
    color: "bg-lipton-amber",
  },
  {
    id: 4,
    name: "Iced Tea",
    description: "Cool & Refreshing",
    image: productIcedTea,
    color: "bg-lipton-gold",
  },
];

const ProductGrid = () => {
  return (
    <section className="py-16 md:py-24 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="section-title mb-4">Our Teas</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover the world of Lipton tea. From classic black teas to refreshing iced blends, 
            there's a perfect cup for every moment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="card-product group cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="p-6 text-center">
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {product.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {product.description}
                </p>
                <button className="btn-yellow text-xs px-6 py-2">
                  EXPLORE
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;
