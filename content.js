var processing = false ;
let all = [] ;
let cgpa ;
chrome.runtime.onMessage.addListener(function(message, sender, senderResponse) {
   if ( !processing ) {
       processing = true ;
      getGrades();
   } 
});
// content.js
// Everytime we visit the matched url (https://stars.bilkent.edu.tr/airs/index.php?do=advs), 
// the following js code executes by chrome.

let curriculum = [
{"code":"CTIS 151","name":"Introduction to Programming"},
{"code":"CTIS 163","name":"Discrete Mathematics"},
{"code":"CTIS 165","name":"Fundamentals of Information Systems"},
{"code":"ENG 101","name":"English and Composition I"},
{"code":"GE 100","name":"Orientation"},
{"code":"TURK 101","name":"Turkish I"},
{"code":"CTIS 152","name":"Algorithms and Data Structures"},
{"code":"CTIS 164","name":"Technical Mathematics with Programming"},
{"code":"CTIS 166","name":"Information Technologies"},
{"code":"ENG 102","name":"English and Composition II"},
{"code":"TURK 102","name":"Turkish II"},
{"code":"","name":"Mathematics Elective"},
{"code":"CTIS 221","name":"Object Oriented Programming"},
{"code":"CTIS 255","name":"Frontend Web Technologies"},
{"code":"CTIS 259","name":"Database Management Systems and Applications"},
{"code":"CTIS 261","name":"Fundamentals of Computer Networks"},
{"code":"GE 250","name":"Collegiate Activities Program I"},
{"code":"","name":"Social Science Core Elective"},
{"code":"CTIS 222","name":"Object Oriented Analysis and Design"},
{"code":"CTIS 256","name":"Introduction to Backend Development"},
{"code":"CTIS 264","name":"Computer Algorithms"},
{"code":"GE 251","name":"Collegiate Activities Program II"},
{"code":"","name":"General Elective"},
{"code":"","name":"Science Core Elective"},
{"code":"COMD 358","name":"Professional Communication"},
{"code":"CTIS 290","name":"Summer Internship"},
{"code":"CTIS 359","name":"Principles of Software Engineering"},
{"code":"CTIS 365","name":"Applied Data Analysis"},
{"code":"CTIS 487","name":"Mobile Application Development"},
{"code":"HIST 200","name":"History of Turkey"},
{"code":"CTIS 310","name":"Semester Internship"},
{"code":"CTIS 411","name":"Senior Project I"},
{"code":"CTIS 496","name":"Computer and Network Security"},
{"code":"HCIV 101","name":"History of Civilization I"},
{"code":"","name":"Arts Core Elective"},
{"code":"","name":"Information Systems Elective"},
{"code":"","name":"Information Systems Elective"},
{"code":"CTIS 456","name":"Senior Project II"},
{"code":"HCIV 102","name":"History of Civilization II"},
{"code":"","name":"General Elective"},
{"code":"","name":"Humanities Core Elective"},
{"code":"","name":"Information Systems Elective"},
{"code":"","name":"Information Systems Elective"},
];

const equivalentCourse = {
    "LNG 171" : "TURK 101",
    "LNG 172" : "TURK 102",
    "THM 105" : "Arts Core Elective",
    "HIST 209" : "HIST 200",
    "TRK 111" : "TURK 101",
    "TRK 112" : "TURK 102",
    "Management Elective" : "Humanities Core Elective",
    "CTIS 417" : "Information Systems Elective"
}

const exemptedCourse = ["MATH 105", "Science Core Elective", "Mathematics Elective"] ;

function getGrades() {
    console.log("Get Grade started");

    // In Advisee page, it collects all students 
    let captions = document.querySelectorAll("span[tip='Curriculum'] a") ;
    let cgpaIdx = $("th:contains('CGPA')").index() + 1; // CGPA, Bilkent içi (VPN ile) 9, dışarıdan 8. sırada 
    //console.log(cgpaIdx);

    let CGPAs = document.querySelectorAll("[id^='advisees_'] td:nth-of-type(" + cgpaIdx + ")");
    cgpa = Array.from(CGPAs);
    cgpa = cgpa.map( item => {
      return item.innerHTML.replace(/&nbsp;/g, "");
    });
    //console.log(cgpa);
    let caps = Array.from(captions)    ;
    //console.log(caps);
    let urls = caps.map( item => {
        // find his/her "id"
        let id = (item.href.split("=")[2]).split("&")[0];
        // build url to retrieve her curriculum
        return "/airs/index.php?do=webservices-redirect&id=" + id + "&service=curriculum&modul=A" ;
    });

    // Her bir öğrenci için curriculum bilgileri isteniyor.
    Promise.all( urls.map(u => fetch(u).then(result=> result.text())))
           .then(texts => {
            // Tüm sonuçlar html formatında geldi,  texts içinde bulunuyor.
            // Herbir öğrencinin curriculum'u için parse işlemi yapılıyor ve processStudent bu bilgileri alacak.
            for ( let text of texts) {
                // html to DOM for easy parsing
                let page = document.createElement("html");
                page.innerHTML = text ;
                processStudent(page);
            }

            // Soyisme göre tüm öğrenciler sıralanacak.
            all.sort((a,b) => a.fullname.localeCompare(b.fullname, "tr")) ;
                            
            // CTIS curriculumda olan tüm dersler birinci öğrencinin curriculumundan alınıyor.
            // keys, curriculumdaki dersleri sırasıyla tutuyor.
            let keys = curriculum.slice(0); // kopyasını çıkar
           
            // Her ders için her öğrencinin notunu ekle { code:"CTIS151", name: "Introd..", "Ali": "A", "Veli: "C"} gibi.
            let last = keys.map((course,idx) => {
                all.forEach(function(std){
                    let findCourseIndex = std.courses.findIndex(c => (c.code == course.code &&  c.name == course.name) ||
                                                      equivalentCourse[c.code] == course.code || 
                                                      equivalentCourse[c.code] == course.name ||
                                                      equivalentCourse[c.name] == course.name) ;

                    if ( findCourseIndex !== -1 ) {
                        course[std.fullname] = std.courses[findCourseIndex].grade ;
                        std.courses.splice(findCourseIndex, 1) ;
                    } else {
                        // eğer curriculum'da bazı dersler yoksa (MATH 105, Science Core) o zaman bunlardan muaftır.
                        if ( exemptedCourse.find(c => c == course.name || c == course.code)) {
                            course[std.fullname] = "M" ;
                        } else {
                            course[std.fullname] = "" ;
                        }
                        
                    }
                });
                return course;
            });

            // CGPA eklemek için
            let cgpa_row = {code:"", "name": ""} ;
            all.forEach(function(std,idx){
               cgpa_row[std.fullname] = cgpa[idx].toString().replace(".", ",") ;
            });
           // console.log(cgpa_row);
            last.push(cgpa_row); 
      
            // "last" is array of courses containing students' grades.
            // convert array into xls. (it actually returns html with .xls extension)
            const xls = new XlsExport(last, 'Grades');
            xls.exportToXLS('airs_grades.xls') ;
            setTimeout(function(){
               // console.log("finished");
                all = [] ;
                cgpa = [] ;
                processing = false ;
                // send message to popup.js
                chrome.runtime.sendMessage({finished : true}) ;
            }, 2000) ;
        }); 
}

// Parsing incoming html curriculum data
function processStudent(page) {
    let curr = [] ;
    // Find user name and lastname from incoming result (html)
    let lastname = $(".row2:first td:eq(1)", page).html();
    let name = $(".row1:first td:eq(1)", page).html();

    // Find all tables for semesters. All semester tables have caption with h3 tag starting with "Fall or Spring"
    $("caption h3", page)
    .filter( function(i) {
        return $(this).html().match(/^(Fall|Spring)/) ;
    })
    .each(function(i) {
        // for each semester, access course rows.
        $("tr:gt(0)",$(this).parent().parent()).each(function(i){
            // for each course, add into curr(iculum) array of the student
            let code = $("td:first", $(this)).html();
            let name = $("td:eq(1)", $(this)).html().replace(/\n|\s+/g, " ").trim();
            let status = $("td:eq(2)", $(this)).html();
            let grade = $("td:eq(3)", $(this)).html().replace(/&nbsp;/g, "");
            let taken = $("td:eq(6)", $(this)).html().replace(/&nbsp;/g, "").replace("<br>","");
            curr.push({
                code, name, status, grade, taken
            });
        }); 
    });
 
    // If a course has an empty grade, check out if the student took that course before
    // It fills with F,FX,FZ or W instead of blank.
    for ( let i=0; i < curr.length; i++) {

        if ( curr[i].status == "Not graded") {
            curr[i].grade = "X" ;
        } else if (curr[i].status == "Exempted") {
            curr[i].grade = "M"
        } else if ( curr[i].code == "" && curr[i].name == "") {
            if ( curr[i-1].grade == "") {
                curr[i-1].grade = curr[i].grade ;
            }
        }
    }

    // Delete rows that represent previous taken courses
    let courses = curr.filter(item => item.code != "" || item.name != "") ;
      
 
    // Add student fullname and her courses/grades into "all" array.
    all.push({
        "fullname" : lastname + " " + name,
        "courses" : courses
    });
}

