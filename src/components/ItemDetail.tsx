import { ArrowLeft, MapPin, Tag } from "lucide-react";
import { Item } from "../lib/supabase";

interface ItemDetailProps {
  item: Item;
  onBack: () => void;
}

export default function ItemDetail({ item, onBack }: ItemDetailProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Search</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {item.photo_url ? (
            <img
              src={item.photo_url}
              alt={item.description}
              className="w-full h-96 object-cover"
            />
          ) : (
            <div className="w-full h-96 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <Tag className="w-24 h-24 text-slate-400" />
            </div>
          )}

          <div className="p-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-6">
              {item.description}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#DBEAFE] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Tag className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-sm text-[#374151] font-medium">Category</p>
                  <p className="text-lg text-black">{item.category}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#D1FAE5] rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-sm text-[#374151] font-medium">Building</p>
                  <p className="text-lg text-black">{item.building}</p>
                </div>
              </div>
            </div>

            {/* Additional Notes intentionally hidden from student view (sensitive). */}
          </div>
        </div>
      </div>
    </div>
  );
}
