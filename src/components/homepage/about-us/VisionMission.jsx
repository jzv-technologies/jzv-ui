import React from "react";

const VisionMission = ({ visionLang, setVisionLang }) => {
  return (
    <div className="max-w-5xl mx-auto py-4">
      <div className="mb-2 flex flex-wrap gap-4 border-b border-light-border pb-6">
        <button
          onClick={() => setVisionLang("en")}
          className={`px-3 sm:px-5 py-3 min-h-[30px] active:scale-[0.96] font-semibold rounded-xl text-lg sm:text-xl transition-all duration-200 ease-out shadow-md ${visionLang === "en" ? "bg-olive-600 text-white hover:bg-olive-700" : "bg-light-ui hover:bg-light-muted text-dark-primary"}`}
        >
          English
        </button>
        <button
          onClick={() => setVisionLang("ur")}
          className={`px-3 sm:px-5 py-3 min-h-[30px] active:scale-[0.96] font-semibold rounded-xl text-lg sm:text-xl transition-all duration-200 ease-out shadow-md ${visionLang === "ur" ? "bg-olive-600 text-white hover:bg-olive-700" : "bg-light-ui hover:bg-light-muted text-dark-primary"}`}
        >
          Urdu
        </button>
      </div>
      {visionLang === "en" ? (
        <div className="space-y-10">
          <div>
            <h4 className="font-bold text-xl sm:text-lg lg:text-2xl text-pine-900 mb-4 flex items-center gap-3">
              <i className="fas fa-binoculars text-olive-700 shrink-0"></i>{" "}
              Vision
            </h4>
            <p className="border-l-8 border-olive-600 pl-5 sm:pl-6 lg:pl-8 bg-light-white shadow-sm rounded-r-xl py-6 text-lg sm:text-xl leading-relaxed text-dark-charcoal">
              To impart knowledge of Revealed Sciences (Quran, Hadith, Tafseer &
              Fiqh) integrated with Natural Sciences (Mathematics, Science,
              Technology) to bring out skilled, competent, and knowledgeable
              Ulama for the overall development of Muslim Ummah and the Country.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-xl sm:text-lg lg:text-2xl text-pine-900 mb-4 flex items-center gap-3">
              <i className="fas fa-bullseye text-olive-700 shrink-0"></i>{" "}
              Mission
            </h4>
            <p className="mb-6 text-lg sm:text-xl text-dark-primary">
              To produce knowledgeable scholars who are:
            </p>
            <ul className="list-none space-y-4 mb-8 m0-regular text-dark-charcoal bg-light-white p-6 sm:p-8 rounded-xl border border-light-border shadow-sm">
              <li className="flex items-center gap-4">
                <i className="fas fa-star text-yellow-gold shrink-0"></i>{" "}
                Experts in both Islamic and Modern education.
              </li>
              <li className="flex items-center gap-4">
                <i className="fas fa-star text-yellow-gold shrink-0"></i>{" "}
                Physically strong, Mentally alert, and Emotionally sound.
              </li>
            </ul>
            <p className="border-l-8 border-blue-primary pl-5 sm:pl-6 lg:pl-8 bg-light-white shadow-sm rounded-r-xl py-6 text-lg sm:text-xl leading-relaxed text-dark-charcoal">
              With the Quran in one hand and the knowledge of modern sciences in
              the other, they will engage in dawah work with wisdom and hikmah.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-10 urdu-text">
          <div>
            <h4 className="font-bold text-xl sm:text-lg lg:text-2xl text-pine-900 mb-4 flex items-center gap-3">
              <i className="fas fa-binoculars text-olive-700 shrink-0"></i> مقصد
            </h4>
            <p className="border-r-8 border-olive-600 pl-5 sm:pl-6 lg:pl-8 bg-light-white shadow-sm rounded-l-xl py-6 text-lg sm:text-xl leading-relaxed text-dark-charcoal">
              علومِ نازلہ (قرآن، حدیث، تفسیر، فقہ) کو علومِ فطریہ (ریاضی، سائنس،
              ٹیکنالوجی) کے ساتھ مربوط کرکے ایسے ماہر، قابل اور صاحبِ علم علماء
              تیار کرنا جو مسلم امہ اور ملک کی مجموعی ترقی میں اپنا کردار ادا
              کریں۔
            </p>
          </div>
          <div>
            <h4 className="font-bold text-xl sm:text-lg lg:text-2xl text-pine-900 mb-4 flex items-center gap-3">
              <i className="fas fa-bullseye text-olive-700 shrink-0"></i> مشن
            </h4>
            <p className="mb-6 text-lg sm:text-xl text-dark-primary">
              ہمارا مقصد علماء کی ایسی تربیت کرنا ہے جو:
            </p>
            <ul className="list-none space-y-4 mb-8 m0-regular text-dark-charcoal bg-light-white p-6 sm:p-8 rounded-xl border border-light-border shadow-sm">
              <li className="flex items-center gap-4">
                <i className="fas fa-star text-yellow-gold shrink-0"></i> اسلامی
                اور جدید علوم دونوں میں ماہر ہوں۔
              </li>
              <li className="flex items-center gap-4">
                <i className="fas fa-star text-yellow-gold shrink-0"></i> جسمانی
                طور پر مضبوط، ذہنی طور پر چوکس، اور جذباتی طور پر متوازن ہوں۔
              </li>
            </ul>
            <p className="border-r-8 border-blue-primary pl-5 sm:pl-6 lg:pl-8 bg-light-white shadow-sm rounded-l-xl py-6 text-lg sm:text-xl leading-relaxed text-dark-charcoal">
              ایک ہاتھ میں قرآن اور دوسرے ہاتھ میں جدید علوم کی بصیرت لیے، یہ
              علماء حکمت اور دانائی کے ساتھ دعوتِ دین کا فریضہ انجام دیں گے۔
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisionMission;
