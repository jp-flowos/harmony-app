"use client";

import {
  Buildings,
  Coffee,
  FirstAid,
  Golf,
  MagnifyingGlass,
  MapPin,
  NavigationArrow,
  Plus,
  Star,
  Tree,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { KakaoMap, type MapPlace } from "@/components/map/KakaoMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface PlaceCategory {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const categories: PlaceCategory[] = [
  { key: "cafe", label: "카페", icon: <Coffee size={20} />, color: "bg-amber-100 text-amber-700" },
  { key: "park", label: "공원", icon: <Tree size={20} />, color: "bg-green-100 text-green-700" },
  { key: "golf", label: "파크골프", icon: <Golf size={20} />, color: "bg-blue-100 text-blue-700" },
  {
    key: "culture",
    label: "문화센터",
    icon: <Buildings size={20} />,
    color: "bg-purple-100 text-purple-700",
  },
  {
    key: "hospital",
    label: "병원",
    icon: <FirstAid size={20} />,
    color: "bg-red-100 text-red-700",
  },
];

const samplePlaces: MapPlace[] = [
  {
    id: "1",
    name: "북한산 둘레길",
    category: "공원",
    lat: 37.6584,
    lng: 126.9866,
    description: "초보자도 걷기 좋은 코스",
  },
  {
    id: "2",
    name: "종로 문화센터",
    category: "문화센터",
    lat: 37.5704,
    lng: 126.9922,
    description: "다양한 시니어 프로그램 운영",
  },
  {
    id: "3",
    name: "양재 시민의 숲",
    category: "공원",
    lat: 37.4706,
    lng: 127.038,
    description: "산책하기 좋은 도심 속 자연",
  },
  {
    id: "4",
    name: "서울숲 카페거리",
    category: "카페",
    lat: 37.5444,
    lng: 127.0374,
    description: "모임하기 좋은 넓은 카페",
  },
  {
    id: "5",
    name: "올림픽공원 파크골프장",
    category: "파크골프",
    lat: 37.5209,
    lng: 127.1212,
    description: "9홀 파크골프 코스",
  },
];

export default function MapPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [newPlace, setNewPlace] = useState({ name: "", category: "cafe", description: "" });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silently fail
      );
    }
  }, []);

  const filteredPlaces = samplePlaces.filter((p) => {
    if (
      selectedCategory &&
      p.category !== categories.find((c) => c.key === selectedCategory)?.label
    )
      return false;
    if (searchQuery && !p.name.includes(searchQuery)) return false;
    return true;
  });

  const handleRegisterPlace = () => {
    // TODO: POST /api/places
    setDialogOpen(false);
    setNewPlace({ name: "", category: "cafe", description: "" });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">지도</h1>
        <div className="flex gap-2">
          {myLocation && (
            <Button variant="outline" size="sm">
              <NavigationArrow size={16} className="mr-1" />내 위치
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus size={16} className="mr-1" />
                장소 추천
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>장소 추천하기</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>장소 이름</Label>
                  <Input
                    placeholder="장소 이름을 입력하세요"
                    value={newPlace.name}
                    onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>카테고리</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <Badge
                        key={cat.key}
                        className={`cursor-pointer ${newPlace.category === cat.key ? "ring-2 ring-orange-400" : ""} ${cat.color}`}
                        onClick={() => setNewPlace({ ...newPlace, category: cat.key })}
                      >
                        {cat.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Textarea
                    placeholder="이 장소를 추천하는 이유를 알려주세요"
                    value={newPlace.description}
                    onChange={(e) => setNewPlace({ ...newPlace, description: e.target.value })}
                  />
                </div>
                <Button className="w-full" onClick={handleRegisterPlace} disabled={!newPlace.name}>
                  추천하기
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <Input
          className="pl-10"
          placeholder="장소 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Badge
          className={`cursor-pointer shrink-0 ${!selectedCategory ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}
          onClick={() => setSelectedCategory(null)}
        >
          전체
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat.key}
            className={`cursor-pointer shrink-0 ${selectedCategory === cat.key ? "bg-orange-500 text-white" : cat.color}`}
            onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
          >
            {cat.icon}
            <span className="ml-1">{cat.label}</span>
          </Badge>
        ))}
      </div>

      {/* Map */}
      <KakaoMap
        places={filteredPlaces}
        center={myLocation ?? undefined}
        onPlaceClick={setSelectedPlace}
        className="h-80"
      />

      {/* Selected place detail */}
      {selectedPlace && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedPlace.name}</h3>
                <Badge variant="secondary" className="mt-1">
                  {selectedPlace.category}
                </Badge>
                {selectedPlace.description && (
                  <p className="mt-2 text-base text-gray-600">{selectedPlace.description}</p>
                )}
              </div>
              <Button variant="outline" size="sm">
                <Star size={16} className="mr-1" />찜
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Nearby / Recommended */}
      <Tabs defaultValue="recommended">
        <TabsList>
          <TabsTrigger value="nearby">
            <MapPin size={16} className="mr-1" />내 근처
          </TabsTrigger>
          <TabsTrigger value="recommended">
            <Star size={16} className="mr-1" />
            추천 장소
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nearby" className="space-y-3">
          {myLocation ? (
            filteredPlaces.map((place) => (
              <Card
                key={place.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedPlace(place)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                      <MapPin size={20} className="text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{place.name}</h3>
                      <p className="text-sm text-gray-500">
                        {place.category} · {place.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="py-8 text-center text-base text-gray-400">
              위치 권한을 허용하면 근처 장소를 볼 수 있어요
            </p>
          )}
        </TabsContent>

        <TabsContent value="recommended" className="space-y-3">
          {filteredPlaces.map((place) => (
            <Card
              key={place.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedPlace(place)}
            >
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-gray-900">{place.name}</h3>
                <p className="text-sm text-orange-500">{place.category}</p>
                <p className="text-base text-gray-500">{place.description}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
