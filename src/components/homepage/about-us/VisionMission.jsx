import React from "react";

const VisionMission = ({ visionLang, setVisionLang }) => {
  return (
    <div className="max-w-5xl mx-auto py-4">
      <div className="mb-2 flex flex-wrap gap-4 border-b border-light-border pb-6 hidden">
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
            <p className="border-l-8 border-olive-600 pl-5 sm:pl-6 lg:pl-8 bg-light-white shadow-sm rounded-r-xl py-6 text-lg sm:text-xl leading-relaxed text-dark-charcoal text-justify pr-4">
              To establish a generation of knowledgeable and competent Ulama who are grounded in the Qur’an and Sunnah while being equipped with contemporary knowledge and practical skills to serve the Muslim Ummah and the nation.
            </p>
            <p className="border-l-8 border-olive-600 pl-5 sm:pl-6 lg:pl-8 bg-light-white shadow-sm rounded-r-xl py-6 text-lg sm:text-xl leading-relaxed text-dark-charcoal text-justify pr-4">
              We envision an educational system where Islamic scholarship, moral excellence, intellectual growth, and social responsibility work together to develop future leaders capable of addressing contemporary challenges with wisdom and integrity.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-xl sm:text-lg lg:text-2xl text-blue-primary mb-4 flex items-center gap-3">
              <i className="fas fa-bullseye text-blue-primary shrink-0"></i>{" "}
              Mission
            </h4>
            <p className="border-l-8 border-blue-primary pl-5 sm:pl-6 lg:pl-8 bg-light-white shadow-sm rounded-r-xl py-6 text-lg sm:text-xl leading-relaxed text-dark-charcoal">
              Our mission is to provide an integrated system of education that combines Revealed Sciences such as Qur’an, Hadith, Tafseer, and Fiqh with modern disciplines including Mathematics, Science, Technology, and communication skills.
             <ul className="list-none space-y-3 text-lg sm:text-lg lg:text-xl text-dark-charcoal pt-6">
              <li className="flex items-start gap-4">
                <i className="fas fa-check text-blue-primary  shrink-0"></i>
                <span>
                  Develop spiritually conscious and morally upright students
                </span>
              </li>
              <li className="flex items-start gap-4">
                <i className="fas fa-check text-blue-primary  shrink-0"></i>
                <span>
                  Foster intellectual curiosity and critical thinking
                </span>
              </li>
              <li className="flex items-start gap-4">
                <i className="fas fa-check text-blue-primary  shrink-0"></i>
                <span>
                  Build emotionally balanced and physically healthy individuals
                </span>
              </li>
              <li className="flex items-start gap-4">
                <i className="fas fa-check text-blue-primary  shrink-0"></i>
                <span>
                  Encourage leadership, discipline, and service to humanity
                </span>
              </li> 
              <li className="flex items-start gap-4">
                <i className="fas fa-check text-blue-primary  shrink-0"></i>
                <span>
                  Prepare students to convey Islamic values with wisdom, compassion, and understanding
                </span>
              </li>
              <li className="flex items-start gap-4">
                <i className="fas fa-check text-blue-primary  shrink-0"></i>
                <span>
                  Foster multilingual literacy in Arabic, English, Tamil, and Urdu
                </span>
              </li>
              <li className="flex items-start gap-4">
                <i className="fas fa-check text-blue-primary  shrink-0"></i>
                <span>
                  Cultivate a sense of social responsibility and service
                </span>
              </li>
            </ul>  
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
            <ul className="list-none space-y-3 mb-8 m0-regular text-dark-charcoal bg-light-white p-6 sm:p-8 rounded-xl border border-light-border shadow-sm">
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
