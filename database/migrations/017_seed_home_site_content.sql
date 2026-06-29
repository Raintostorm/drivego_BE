INSERT INTO site_content (key, value)
VALUES (
  'home',
  $json$
  {
    "center": {
      "name": "Trung tâm Đào tạo Lái xe DriveGo Sài Gòn",
      "address": "Khu thực hành Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh",
      "phone": "0976 693 436",
      "email": "tuvan@drivego.space",
      "hours": "Thứ 2 - Chủ nhật, 07:30 - 20:30",
      "bank": "MBBank 0976693436 - VU HA GIA BAO"
    },
    "popularPlan": {
      "eyebrow": "Gói học phổ biến",
      "title": "Bằng B2 trọn lộ trình — từ 25.000.000đ",
      "cta": "Xem tất cả"
    },
    "services": [
      {
        "title": "Khóa học bằng lái xe máy A1",
        "price": "từ 900.000đ",
        "desc": "Gói học gọn cho người mới, hỗ trợ hồ sơ, lịch ôn lý thuyết và luyện thi trước ngày sát hạch.",
        "imageKey": "bikeYard"
      },
      {
        "title": "Khóa học ô tô B1/B2 trọn lộ trình",
        "price": "từ 25.000.000đ",
        "desc": "Theo dõi lý thuyết, thực hành, lịch học và hồ sơ trên cùng một tài khoản DriveGo.",
        "imageKey": "drivingTrack"
      }
    ],
    "highlights": [
      "Hồ sơ, học phí và tiến độ được hiển thị rõ ràng cho từng hạng A1, A2, B1, B2.",
      "Bộ đề luyện thi tách riêng, không pha vào database vận hành thường ngày.",
      "AI Chat hỗ trợ giải thích luật, biển báo và mẹo ôn tập theo nhu cầu học viên.",
      "Theo dõi lịch học, lịch thi, thông báo và trạng thái premium trong dashboard."
    ],
    "gallery": [
      { "imageKey": "practiceLine", "alt": "Sân thực hành xe máy DriveGo" },
      { "imageKey": "practiceClass", "alt": "Khu vực hướng dẫn thực hành" },
      { "imageKey": "studentBriefing", "alt": "Buổi phổ biến trước giờ học" },
      { "imageKey": "bikeYard", "alt": "Khu luyện sa hình xe máy" },
      { "imageKey": "motorbikeRow", "alt": "Dàn xe thực hành" },
      { "imageKey": "groupClass", "alt": "Lớp học tập trung" },
      { "imageKey": "theoryClass", "alt": "Phòng học lý thuyết" },
      { "imageKey": "instructorBike", "alt": "Xe hướng dẫn thực hành" },
      { "imageKey": "emptyYard", "alt": "Sân tập lái" },
      { "imageKey": "scooterGarage", "alt": "Khu để xe học viên" },
      { "imageKey": "drivingTrack", "alt": "Đường luyện tập sát hạch" }
    ],
    "news": [
      {
        "title": "Cập nhật quy trình đăng ký GPLX trực tuyến",
        "date": "30 Tháng 06",
        "desc": "Học viên có thể chuẩn bị thông tin cá nhân, hồ sơ và chọn hạng học ngay trên DriveGo.",
        "imageKey": "theoryClass"
      },
      {
        "title": "Mẹo ôn 600 câu lý thuyết hiệu quả",
        "date": "27 Tháng 06",
        "desc": "Tập trung câu điểm liệt, nhóm biển báo dễ nhầm và luyện đề ngẫu nhiên theo hạng bằng.",
        "imageKey": "groupClass"
      },
      {
        "title": "Theo dõi học phí và premium trong admin",
        "date": "22 Tháng 06",
        "desc": "Admin có thể cập nhật học phí theo từng hạng và gói premium để học viên xem đúng giá.",
        "imageKey": "instructorBike"
      }
    ]
  }
  $json$::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();
